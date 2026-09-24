import "server-only";

import { resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";
import type { DemandCell } from "./cell";

/**
 * V-10: RECORD ONE SEARCH AS A CELL, ON THE SERVER, AFTER IT HAS RUN.
 *
 * No client can record demand (review of 24 September): `record_search_demand`
 * is executable by the service role only, and it is called from here, by the
 * search page, with the result count the page computed itself and an area
 * already reduced to a name on the closed list (the database checks the list
 * again). The searcher's id goes in only to be hashed with this week's salt,
 * so the database can count distinct people and keep one row per person per
 * cell per week; the salt is deleted when the week ends (migration
 * 20260924121400). A per-person daily ceiling bounds the calls.
 *
 * Split in two because the write runs in `after()`, where request APIs are
 * not available: `demandRecorder` reads the session during the request and
 * returns the write to run later, or null when there is nothing to record.
 * Failure is silent: a missed count must never cost a search.
 */

type Rpc = (fn: "record_search_demand", args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;

export async function demandRecorder(cell: DemandCell | null): Promise<(() => Promise<void>) | null> {
  if (!cell || !isSupabaseConfigured()) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const userId = session.user.id;
  return async () => {
    try {
      const verdict = await consume({
        bucket: "search_demand",
        subject: subjectForUser(userId),
        limit: 100,
        windowSeconds: 24 * 60 * 60,
      });
      if (!verdict.allowed) return;
      const admin = createAdminClient();
      const rpc = admin.rpc.bind(admin) as unknown as Rpc;
      await rpc("record_search_demand", {
        p_user: userId,
        p_state_code: cell.stateCode,
        p_area_key: cell.areaKey,
        p_market: cell.market,
        p_bedrooms_min: cell.bedroomsMin,
        p_budget_band: cell.budgetBand,
        p_results: cell.results,
      });
    } catch {
      /* A missed count is not worth a broken search. */
    }
  };
}
