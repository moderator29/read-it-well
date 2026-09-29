import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { requireAdmin, type StaffScope } from "./guard";

/**
 * TEAM OVERSIGHT: what is waiting, for how long, and who has been deciding.
 *
 * For whoever runs the team (an admin, or a staff member holding the
 * operations scope). Two reads, both exact and both from records that already
 * exist:
 *
 *  - BACKLOG per queue: how many items wait, and how long the oldest has
 *    waited, so a lead moves people to where the queue is.
 *  - THROUGHPUT per staff member over 30 days: their decisions by kind, read
 *    from the audit log, so work is visible and uneven load is caught early.
 *
 * Read on the service role after the guard, like the rest of the console.
 */

export type BacklogRow = {
  queue: string;
  scope: StaffScope;
  waiting: number;
  oldestAt: string | null;
  href: string;
};

export type ThroughputRow = {
  actorId: string;
  name: string;
  total: number;
  byAction: Record<string, number>;
  lastAt: string;
};

export type Oversight =
  | { state: "ok"; backlog: BacklogRow[]; throughput: ThroughputRow[]; since: string }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Db = SupabaseClient;

/**
 * Audit actions that are not decisions: looking at something, claiming it,
 * or reading the handbook. Everything else a staff account wrote is work.
 */
export const NOT_DECISIONS = [
  "person.view",
  "document.viewed",
  "payment_methods.viewed",
  "queue.take",
  "queue.release",
  "staff.handbook_acknowledged",
  "money.history_exported",
  "audit.exported",
  "oversight.exported",
] as const;

const BACKLOG: { queue: string; scope: StaffScope; table: string; at: string; column: string; statuses: string[]; href: string }[] = [
  { queue: "Listings to review", scope: "listing_approval", table: "listings", at: "submitted_at", column: "status", statuses: ["SUBMITTED", "UNDER_REVIEW"], href: "/admin/listings" },
  { queue: "Applications to verify", scope: "kyc_review", table: "agent_applications", at: "submitted_at", column: "status", statuses: ["SUBMITTED", "UNDER_REVIEW"], href: "/admin/agents" },
  { queue: "Reports", scope: "moderation", table: "reports", at: "created_at", column: "status", statuses: ["open", "reviewing"], href: "/admin/queue?tab=reports" },
  { queue: "Message flags", scope: "moderation", table: "message_flags", at: "created_at", column: "status", statuses: ["open"], href: "/admin/queue?tab=flags" },
  { queue: "Support tickets", scope: "support", table: "support_tickets", at: "created_at", column: "status", statuses: ["open", "pending"], href: "/admin/support" },
  { queue: "Agreements to approve", scope: "agreements", table: "deal_agreements", at: "submitted_at", column: "status", statuses: ["in_review"], href: "/admin/agreements" },
  { queue: "Guarantee claims", scope: "guarantee", table: "guarantee_claims", at: "created_at", column: "status", statuses: ["submitted"], href: "/admin/agreements#claims" },
];

export async function readOversight(now = Date.now()): Promise<Oversight> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return { state: "forbidden" };
  let db: Db;
  try {
    db = createAdminClient() as unknown as Db;
  } catch {
    return { state: "unavailable" };
  }
  const since = new Date(now - 30 * 86_400_000).toISOString();
  try {
    const backlog = await Promise.all(
      BACKLOG.map(async (q) => {
        const [count, oldest] = await Promise.all([
          db.from(q.table).select("id", { count: "exact", head: true }).in(q.column, q.statuses),
          db.from(q.table).select(q.at).in(q.column, q.statuses).not(q.at, "is", null).order(q.at, { ascending: true }).limit(1),
        ]);
        if (count.error || oldest.error) throw new Error("backlog");
        const first = (oldest.data?.[0] ?? null) as Record<string, string> | null;
        return { queue: q.queue, scope: q.scope, waiting: count.count ?? 0, oldestAt: first?.[q.at] ?? null, href: q.href };
      }),
    );

    /* Everybody who can act: live grants and the admin roles. */
    const [grants, roles] = await Promise.all([
      db.from("staff_grants").select("user_id").is("revoked_at", null),
      db.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]),
    ]);
    if (grants.error || roles.error) return { state: "unavailable" };
    const staffIds = [
      ...new Set([...(grants.data ?? []), ...(roles.data ?? [])].map((r) => (r as { user_id: string }).user_id)),
    ];
    const { data: acts, error } = staffIds.length
      ? await db
          .from("audit_log")
          .select("actor_id, action, created_at")
          .in("actor_id", staffIds)
          .not("action", "in", `(${NOT_DECISIONS.map((a) => `"${a}"`).join(",")})`)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20_000)
      : { data: [], error: null };
    if (error) return { state: "unavailable" };
    const rows = (acts ?? []) as { actor_id: string; action: string; created_at: string }[];
    const by = new Map<string, ThroughputRow>();
    for (const row of rows) {
      const entry = by.get(row.actor_id) ?? { actorId: row.actor_id, name: "", total: 0, byAction: {}, lastAt: row.created_at };
      entry.total += 1;
      entry.byAction[row.action] = (entry.byAction[row.action] ?? 0) + 1;
      if (row.created_at > entry.lastAt) entry.lastAt = row.created_at;
      by.set(row.actor_id, entry);
    }
    const ids = [...by.keys()];
    if (ids.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
        const entry = by.get(p.id);
        if (entry) entry.name = p.display_name ?? "";
      }
    }
    const throughput = [...by.values()]
      .map((t) => ({ ...t, name: t.name || "A member of staff" }))
      .sort((a, b) => b.total - a.total);
    return { state: "ok", backlog, throughput, since };
  } catch {
    return { state: "unavailable" };
  }
}
