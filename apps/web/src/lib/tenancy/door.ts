import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

/**
 * "Moved in for the Vallo price" (V-59): how many tenants of this listing said
 * they paid nothing beyond what they paid on Vallo, from `public.door_honesty`,
 * which publishes that count and nothing else, and only from five up. Null
 * when there is none or the read fails: a null draws no line.
 */

/** Below this the database publishes nothing and the page prints nothing. */
export const DOOR_MIN_TENANTS = 5;
export async function readDoorHonesty(listingId: string): Promise<number | null> {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("door_honesty")
      .select("nothing_more")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (error || !data) return null;
    const n = Number((data as { nothing_more: number }).nothing_more);
    return Number.isInteger(n) && n >= DOOR_MIN_TENANTS ? n : null;
  } catch {
    return null;
  }
}

/** The sentence, or null below five. */
export function doorHonestyLine(count: number | null, copy: { doorMany: string }): string | null {
  if (count === null || !Number.isInteger(count) || count < DOOR_MIN_TENANTS) return null;
  return copy.doorMany.replace("{count}", String(count));
}
