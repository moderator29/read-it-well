import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * The held-payment kill switch, and it FAILS CLOSED.
 *
 * WHY THIS IS NOT `lib/flags.ts`. That module is fail-open by design and says
 * so in its own header: a missing table, a missing row, a network error or an
 * absent configuration all mean enabled. That is the right default for a flag
 * whose job is to switch a FEATURE off during an incident, because a flaky
 * read should not take a working product down.
 *
 * It is exactly the wrong default for a flag whose job is to stop MONEY
 * MOVING. `docs/research/ESCROW_END_TO_END_RESEARCH.md` 5.8 asks for a kill
 * switch checked in a server action that fails closed, and notes that the
 * existing helper cannot be it. A held payment that opens because the flags
 * table was briefly unreachable is a held payment nobody chose to allow.
 *
 * SO: ANYTHING OTHER THAN A ROW THAT SAYS TRUE MEANS NO.
 *
 *   No Supabase configuration   ->  closed
 *   The read throws             ->  closed
 *   The read errors             ->  closed
 *   No row for the key          ->  closed
 *   A row with enabled = false  ->  closed
 *   A row with enabled = true   ->  open
 *
 * The missing row case is the one worth naming. Under fail-open, a feature
 * with no flag row is on. Here it is off, which means this feature cannot
 * reach a person until somebody has deliberately written a row saying so, in
 * the same database an operator can switch off in one statement at 3am.
 *
 * NOT CACHED. `lib/flags.ts` caches for thirty seconds so a layout can consult
 * a flag without hammering Postgres. A kill switch that takes up to thirty
 * seconds to bite is a kill switch that let thirty seconds of money through,
 * and this is read once per money action rather than once per render.
 */
const ESCROW_FLAG_KEY = "held_payments";

/** True only when a row exists and says true. Every other answer is false. */
export async function heldPaymentsAreOpen(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", ESCROW_FLAG_KEY)
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * The sentence a person sees when the switch is off.
 *
 * It does not say "coming soon" and it does not apologise for a feature it has
 * not promised. It says what did not happen and that nothing moved, which is
 * rule 3 of the copy rules and the only thing somebody in the middle of a
 * money action actually needs.
 */
export const HELD_PAYMENTS_CLOSED_MESSAGE =
  "Held payments are not available at the moment, so nothing was moved.";
