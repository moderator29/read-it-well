import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * A fail-closed feature flag, the pattern of `lib/escrow/flag.ts`: true only
 * when the `feature_flags` row exists and says true. Every other answer,
 * including a failed read, is false.
 */
export async function flagIsOn(key: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

/** V-41: residents' reports beside the lister's claim. */
export const NEIGHBOURS_FLAG = "neighbours_account";
/** V-43: rush-hour times to named places. */
export const COMMUTE_FLAG = "commute_by_the_clock";
/** V-69: a renter asks the lister for one clip. */
export const SHOW_ME_FLAG = "show_me";
