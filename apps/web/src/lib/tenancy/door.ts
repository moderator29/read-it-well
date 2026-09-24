import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

/**
 * "Moved in for the Vallo price" (V-59): of the tenants of this listing who
 * answered, how many said they paid nothing beyond what they paid on Vallo,
 * from `public.door_honesty`, which publishes that pair and nothing else, and
 * only once five have answered. Null when there is none or the read fails: a
 * null draws no line.
 */

/** Below this many tenants answering, the database publishes nothing and the page prints nothing. */
export const DOOR_MIN_TENANTS = 5;

export type DoorHonesty = { nothingMore: number; answered: number };

export async function readDoorHonesty(listingId: string): Promise<DoorHonesty | null> {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("door_honesty")
      .select("nothing_more, answered")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as { nothing_more: number; answered: number };
    return { nothingMore: Number(row.nothing_more), answered: Number(row.answered) };
  } catch {
    return null;
  }
}

/** The sentence, "N of M", or null below five answers or on a row that does not add up. */
export function doorHonestyLine(door: DoorHonesty | null, copy: { doorMany: string }): string | null {
  if (!door) return null;
  const { nothingMore, answered } = door;
  if (!Number.isInteger(nothingMore) || !Number.isInteger(answered)) return null;
  if (answered < DOOR_MIN_TENANTS || nothingMore < 0 || nothingMore > answered) return null;
  return copy.doorMany.replace("{count}", String(nothingMore)).replace("{total}", String(answered));
}
