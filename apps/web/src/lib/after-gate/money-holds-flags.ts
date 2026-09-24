import "server-only";

import { heldPaymentsAreOpen } from "../escrow/flag";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * V-56 and V-92 switches. FAIL CLOSED, exactly like `lib/escrow/flag.ts`: a
 * missing row, a false row, an unconfigured database and a failed read all
 * answer false, and nothing is cached, so switching one off bites on the next
 * read. Migration 20260924141000 writes both rows OFF.
 *
 * To turn one on, once the pieces the migration lists exist:
 *   update public.feature_flags set enabled = true where key = 'rent_agency_hold';
 *   update public.feature_flags set enabled = true where key = 'stay_caution_hold';
 */
export const RENT_AGENCY_HOLD_FLAG = "rent_agency_hold";
export const STAY_CAUTION_HOLD_FLAG = "stay_caution_hold";

async function rowSaysTrue(key: string): Promise<boolean> {
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

/** V-56 draws its lines only when its own switch AND held payments are on. */
export async function agencyHoldIsOpen(): Promise<boolean> {
  const [own, held] = await Promise.all([rowSaysTrue(RENT_AGENCY_HOLD_FLAG), heldPaymentsAreOpen()]);
  return own && held;
}

export async function stayCautionHoldIsOpen(): Promise<boolean> {
  return rowSaysTrue(STAY_CAUTION_HOLD_FLAG);
}
