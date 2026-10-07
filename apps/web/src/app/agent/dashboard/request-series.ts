import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { rangeFloor, type RangeRow } from "@/components/workspace/range-buckets";

/**
 * THE AGENT DASHBOARD FIGURE'S ROWS: every viewing request made to this
 * lister in the last thirty days, by when it was made.
 *
 * Its own read rather than the inspections list the dashboard already has,
 * because that list is bounded for the "needs you" rows (a few dozen, open
 * ones first) and a count drawn from a bounded list would quietly stop
 * counting. This reads one column over exactly the window the figure shows,
 * under the same row level security the inspections page reads through.
 * Null when the read fails: the card is then not drawn, rather than drawn
 * at nought.
 */
const CEILING = 1000;

export async function readRequestSeries(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: Date,
): Promise<RangeRow[] | null> {
  try {
    const { data, error } = await supabase
      .from("inspection_requests")
      .select("created_at")
      .eq("lister_id", userId)
      .gte("created_at", rangeFloor(now))
      .order("created_at", { ascending: false })
      .limit(CEILING);
    /* At the ceiling (the API returns at most a thousand rows) the count
       could be short, and a short count is a wrong number: no card. */
    if (error || (data?.length ?? 0) >= CEILING) return null;
    return ((data ?? []) as { created_at: string }[]).map((row) => ({ at: row.created_at }));
  } catch {
    return null;
  }
}
