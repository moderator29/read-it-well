import "server-only";

/**
 * Reading the audit log.
 *
 * `audit_log` has been written to since the first migration and has never
 * had a reader: 482 rows at the time the queue frame was built, every
 * privileged decision and every kobo that moved, visible only to somebody
 * with a SQL console. This is the reader (B5, B7's "audit-log viewer").
 *
 * Reads go through the service role, but only after `requireAdmin` has
 * passed inside this module, the same shape as `business-queries.ts`. The
 * table's own select policy would let the admin's RLS client read it too;
 * the service role is used so the actor names can be resolved from
 * `profiles` in the same breath without depending on that table's policy.
 *
 * WHAT A ROW SHOWS AND WHAT IT DOES NOT. Exactly the columns the row holds:
 * when, who (a display name, never an email), the action, the target type
 * and id, and the metadata bag the writer chose to keep. Nothing is joined
 * in from the target: the desk is a ledger of decisions, not a second view
 * of every table, and reaching into a booking or a wallet from here would
 * show an operator more than the line they came to read.
 *
 * AND THE BAG IS SCRUBBED ON THE WAY OUT. `metadata` is free-form and two
 * dozen call sites write it; every one of them is clean today, which is a
 * fact about today and not a property of this reader. `safeAuditMetadata`
 * withholds any key naming an identity document or a credential (NIN, BVN,
 * bank account, card, token, secret, signature, password, email, phone)
 * before the row leaves this function, so rule 16 holds at the reader as well
 * as the writer. It is the same vocabulary `lib/alerts/record.ts` applies at
 * the other end of the pipe, and `audit-filter.test.ts` proves it.
 */

import { createAdminClient } from "../supabase/admin";
import type { Json } from "../supabase/database.types";
import {
  auditIdExpression,
  auditTextExpression,
  planAuditQuery,
  safeAuditMetadata,
} from "./audit-filter";
import { requireAdmin } from "./guard";
import { takePage, type AdminQueueFilter } from "./queue-filter";
import type { AdminRead } from "./queries";

const UNAVAILABLE = { state: "unavailable" } as const;

export type AuditRowView = {
  id: string;
  createdAt: string;
  actorId: string | null;
  /** A display name, or null for the processor and the clock. */
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  /** The writer's own bag, as stored. Rendered behind a disclosure. */
  metadata: Json;
};

export type AuditPage = { rows: AuditRowView[]; full: boolean };

export async function getAuditLog(filter?: AdminQueueFilter): Promise<AdminRead<AuditPage>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  const plan = planAuditQuery(filter);

  try {
    const admin = createAdminClient();
    let select = admin
      .from("audit_log")
      .select("id, created_at, actor_id, action, entity_type, entity_id, metadata");
    if (plan.exactId) select = select.or(auditIdExpression(plan.exactId));
    if (plan.textLike) select = select.or(auditTextExpression(plan.textLike));
    if (plan.entityType) select = select.eq("entity_type", plan.entityType);
    if (plan.fromIso) select = select.gte("created_at", plan.fromIso);
    if (plan.toIso) select = select.lte("created_at", plan.toIso);

    const { data, error } = await select
      .order("created_at", { ascending: false })
      .range(plan.range.from, plan.range.to);
    if (error) return UNAVAILABLE;

    const { rows, full } = takePage(data ?? [], plan.pageSize);

    // One read for every distinct actor on the page, not one per row.
    const actorIds = [
      ...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      for (const profile of profiles ?? []) {
        if (profile.display_name) names.set(profile.id, profile.display_name);
      }
    }

    return {
      state: "ok",
      data: {
        full,
        rows: rows.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          actorId: row.actor_id,
          actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          /* Rule 16 at the reader, not only at the writer: see
             `safeAuditMetadata`. Every writer in the tree is clean today,
             which is a fact about today, and this row is about to be put in
             front of every admin. */
          metadata: safeAuditMetadata(row.metadata) as Json,
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}
