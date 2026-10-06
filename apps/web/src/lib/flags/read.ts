import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * A fail-closed feature flag, the pattern of the retired escrow flag: true only
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
/** ROOM BOOKINGS 1: hotel rooms can be requested and paid for (off until the founder switches it on). */
export const ROOM_BOOKINGS_FLAG = "room_bookings";
/**
 * D60: whether "Send for review" waits for the lister's recorded fee
 * acceptance (D51, D61). The screen is in the wizard regardless; only the
 * blocking is behind this, and with no row it reads off, so publishing is
 * never blocked until Session 2's rate read and acceptance record exist. To
 * turn it on, the day they do:
 *   insert into public.feature_flags (key, enabled) values ('lister_fee_gate_blocking', true)
 *   on conflict (key) do update set enabled = true;
 */
export const LISTER_FEE_GATE_BLOCKING_FLAG = "lister_fee_gate_blocking";
