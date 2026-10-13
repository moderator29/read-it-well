import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../../supabase/admin";
import { requireAdmin } from "../guard";

/**
 * THE BADGES THE QUEUE COUNTS DO NOT CARRY (admin coverage, 13 October 2026).
 *
 * `getQueueCounts` is the seven queues. These are three more things that wait
 * on a person and had no figure on their rail row:
 *
 *   retention      purged accounts whose money records are past their
 *                  retention date and still undestroyed (Record retention)
 *   seatings       restaurant seatings the restaurant and the diner disagree
 *                  about, unresolved (Restaurant fees)
 *   recovery       email recoveries opened and not yet finished (Account
 *                  recovery)
 *
 * Exact counts on the service role, read once per request like the queue
 * counts, and only for an admin: the rail they badge is the admin rail. A
 * count that cannot be read is simply absent, never zero.
 */
export const getCoverageCounts = cache(async (): Promise<Record<string, number>> => {
  const access = await requireAdmin();
  if (access.state !== "admin" || access.isStaff) return {};
  /* Untyped on purpose: reservation_seatings and email_recovery_requests are
     newer than the generated types, as the desks that read them already cast. */
  let db: SupabaseClient;
  try {
    db = createAdminClient() as unknown as SupabaseClient;
  } catch {
    return {};
  }
  const out: Record<string, number> = {};
  const nowIso = new Date().toISOString();
  const [retention, seatings, recovery] = await Promise.all([
    db
      .from("account_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "PURGED")
      .not("money_retain_until", "is", null)
      .lte("money_retain_until", nowIso),
    db
      .from("reservation_seatings")
      .select("reservation_id", { count: "exact", head: true })
      .not("disputed_at", "is", null)
      .is("dispute_resolved_at", null),
    db
      .from("email_recovery_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["cooling_off", "completing"]),
  ]);
  if (!retention.error && retention.count !== null) out["retention"] = retention.count;
  if (!seatings.error && seatings.count !== null) out["seatings"] = seatings.count;
  if (!recovery.error && recovery.count !== null) out["recovery"] = recovery.count;
  return out;
});
