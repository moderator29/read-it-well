import "server-only";

import { getDictionary, type Locale } from "@vallo/i18n";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { isShotSlot, photographed, type ShotSlot } from "./shot-list";

/**
 * V-70. "Photographed: kitchen, prepaid meter" for a shelf of cards, in one
 * read for all of them. Only published listings' labels are readable, and a
 * card with no labels, or a failed read, gets no caption.
 */
export async function readPhotographedCaptions(listingIds: string[], locale: Locale): Promise<Map<string, string>> {
  const captions = new Map<string, string>();
  if (listingIds.length === 0 || !isSupabaseConfigured()) return captions;
  try {
    const supabase = (await createClient()) as unknown as {
      from(table: string): {
        select(cols: string): { in(col: string, values: string[]): Promise<{ data: unknown; error: unknown }> };
      };
    };
    const { data, error } = await supabase.from("listing_photo_slots").select("listing_id, slot").in("listing_id", listingIds.slice(0, 200));
    if (error || !Array.isArray(data)) return captions;
    const byListing = new Map<string, ShotSlot[]>();
    for (const row of data as { listing_id: string; slot: unknown }[]) {
      if (!isShotSlot(row.slot)) continue;
      byListing.set(row.listing_id, [...(byListing.get(row.listing_id) ?? []), row.slot]);
    }
    const copy = getDictionary(locale).afterTheGate.shots;
    for (const [id, slots] of byListing) {
      const names = photographed(slots).map((slot) => copy.slots[slot].toLowerCase());
      if (names.length > 0) captions.set(id, copy.photographed.replace("{slots}", names.join(", ")));
    }
    return captions;
  } catch {
    return captions;
  }
}
