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

/* --------------------------------------------------------------- activity */

/**
 * The shape of the log over time, for the console's charts.
 *
 * WHY THIS IS A SEPARATE READ FROM `getAuditLog`. That one is a PAGE: it
 * returns `QUEUE_PAGE_SIZE` rows after the operator's filters and their
 * cursor. A chart drawn over a page is a chart of the page, and it would be
 * labelled "actions per day" while showing "actions per day among the fifty
 * rows this operator happens to be looking at". That is rule 15 territory, and
 * it is the exact mistake the research names in `money-queries.ts`'s
 * `RECENT_LIMIT`. So the chart gets its own read, over its own window, and
 * says what that window is.
 *
 * AND IT SAYS WHEN IT IS A FLOOR. `WINDOW_CAP` bounds the read. When the
 * window genuinely holds more rows than the cap, `capped` comes back true and
 * the desk prints the caveat rather than drawing a shape that is right and a
 * total that is short. `audit_log` held 482 rows when the queue frame was
 * built, so this will not fire for a long time; it is here because the day it
 * does fire, nothing about the chart's appearance would otherwise change.
 *
 * THE DAYS ARE COMPLETE, INCLUDING THE EMPTY ONES. A series that plots only
 * the days something happened compresses a quiet fortnight into one step and
 * draws a busier platform than exists. Every day in the window gets a point,
 * and most of them are zero, and that is the true picture.
 *
 * NO FILTERS ARE APPLIED. The charts describe the log, not the operator's
 * current narrowing, because a chart that silently follows a search box is a
 * chart whose caption is wrong.
 */
export type AuditActivity = {
  /** Ascending, one entry per day in the window, zeroes included. */
  perDay: { day: string; count: number }[];
  byKind: { label: string; count: number }[];
  byActor: { label: string; count: number }[];
  windowDays: number;
  total: number;
  /** True when the read hit `WINDOW_CAP`, so `total` is a floor. */
  capped: boolean;
};

/** The window every chart on this desk draws. */
export const AUDIT_WINDOW_DAYS = 30;

/**
 * The most rows one activity read will pull. Chosen so a month of a busy
 * platform still fits: at the cap the totals become a floor and say so.
 */
const WINDOW_CAP = 5000;

/** The actor label for a row nobody signed: the processor, the clock, the job. */
const SYSTEM_ACTOR = "System";

export async function getAuditActivity(): Promise<AdminRead<AuditActivity>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  const since = new Date(Date.now() - (AUDIT_WINDOW_DAYS - 1) * 86_400_000);
  const sinceDay = dayKey(since);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("audit_log")
      .select("created_at, actor_id, entity_type")
      .gte("created_at", `${sinceDay}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .limit(WINDOW_CAP);
    if (error) return UNAVAILABLE;

    const rows = data ?? [];
    const capped = rows.length >= WINDOW_CAP;

    /* Every day in the window, seeded at zero, so a quiet week draws as a
       quiet week rather than disappearing. */
    const byDay = new Map<string, number>();
    for (let i = 0; i < AUDIT_WINDOW_DAYS; i += 1) {
      byDay.set(dayKey(new Date(since.getTime() + i * 86_400_000)), 0);
    }

    const byKind = new Map<string, number>();
    const byActorId = new Map<string, number>();
    let systemCount = 0;

    for (const row of rows) {
      const day = row.created_at.slice(0, 10);
      if (byDay.has(day)) byDay.set(day, (byDay.get(day) ?? 0) + 1);
      byKind.set(row.entity_type, (byKind.get(row.entity_type) ?? 0) + 1);
      if (row.actor_id) byActorId.set(row.actor_id, (byActorId.get(row.actor_id) ?? 0) + 1);
      else systemCount += 1;
    }

    /* A display name, never an email. Rule 16, and the same rule `getAuditLog`
       already holds one function above. An actor whose profile has no display
       name is counted under the system label rather than under a bare uuid,
       because a uuid in a chart is an identifier leaked into a picture. */
    const actorIds = [...byActorId.keys()];
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

    const byActorLabel = new Map<string, number>();
    if (systemCount > 0) byActorLabel.set(SYSTEM_ACTOR, systemCount);
    for (const [id, count] of byActorId) {
      const label = names.get(id) ?? SYSTEM_ACTOR;
      byActorLabel.set(label, (byActorLabel.get(label) ?? 0) + count);
    }

    const descending = (a: { count: number }, b: { count: number }) => b.count - a.count;

    return {
      state: "ok",
      data: {
        perDay: [...byDay.entries()]
          .map(([day, count]) => ({ day, count }))
          .sort((a, b) => a.day.localeCompare(b.day)),
        byKind: [...byKind.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort(descending),
        byActor: [...byActorLabel.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort(descending),
        windowDays: AUDIT_WINDOW_DAYS,
        total: rows.length,
        capped,
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** `YYYY-MM-DD` in UTC, which is the same key `created_at` slices to. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
