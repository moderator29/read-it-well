import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

/**
 * "Moved in for the Vallo price" (V-59): how many tenants of this listing said
 * they paid nothing beyond what they paid on Vallo, from `public.door_honesty`.
 * The database publishes that number only once at least five tenants said so
 * (fewer, beside a count of answers, would point at the few who said yes), and
 * never publishes how many answered in all. Null when there is none or the
 * read fails: a null draws no line.
 */
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
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** The database's own floor, held here as well so a stray row cannot print. */
export const DOOR_HONESTY_FLOOR = 5;

/** The sentence, N only; nothing under the floor or for a failed read. */
export function doorHonestyLine(count: number | null, copy: { doorMany: string }): string | null {
  if (count === null || !Number.isInteger(count) || count < DOOR_HONESTY_FLOOR) return null;
  return copy.doorMany.replace("{count}", String(count));
}
