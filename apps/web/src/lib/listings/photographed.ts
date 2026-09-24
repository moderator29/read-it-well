import "server-only";

import { getDictionary, type Locale } from "@vallo/i18n";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { claimsOf, isShotSlot, photographedClaimed, type ShotSlot, type UtilityClaims } from "./shot-list";

const PAGE = 500;

type Page = { data: unknown; error: unknown };
type Loose = {
  from(table: string): {
    select(cols: string): {
      in(col: string, values: string[]): Promise<Page> & {
        order(col: string): { range(from: number, to: number): Promise<Page> };
      };
    };
  };
};

/**
 * V-70. "Photographed: kitchen, prepaid meter" for a shelf of cards, in a
 * paged read for all of them, so a server row cap never cuts a card's labels
 * short. Only published, non-example listings' labels are readable; a meter,
 * water or power label shows only while its listing still claims it; a card
 * with no labels, or a failed read, gets no caption.
 */
export async function readPhotographedCaptions(listingIds: string[], locale: Locale): Promise<Map<string, string>> {
  const captions = new Map<string, string>();
  const ids = listingIds.slice(0, 200);
  if (ids.length === 0 || !isSupabaseConfigured()) return captions;
  try {
    const supabase = (await createClient()) as unknown as Loose;
    const listings = await supabase.from("listings").select("id, is_demo, prepaid_meter, water_supply, power_backup").in("id", ids);
    if (listings.error || !Array.isArray(listings.data)) return captions;
    const claims = new Map<string, UtilityClaims>();
    for (const row of listings.data as Record<string, unknown>[]) {
      if (row.is_demo === true) continue;
      claims.set(String(row.id), claimsOf(row));
    }
    const wanted = ids.filter((id) => claims.has(id));
    if (wanted.length === 0) return captions;

    const byListing = new Map<string, ShotSlot[]>();
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("listing_photo_slots")
        .select("photo_id, listing_id, slot")
        .in("listing_id", wanted)
        .order("photo_id")
        .range(from, from + PAGE - 1);
      if (error || !Array.isArray(data)) return new Map();
      for (const row of data as { listing_id: string; slot: unknown }[]) {
        if (!isShotSlot(row.slot)) continue;
        byListing.set(row.listing_id, [...(byListing.get(row.listing_id) ?? []), row.slot]);
      }
      if (data.length < PAGE) break;
    }
    const copy = getDictionary(locale).afterTheGate.shots;
    for (const [id, slots] of byListing) {
      const names = photographedClaimed(slots, claims.get(id) as UtilityClaims).map((slot) => copy.slots[slot].toLowerCase());
      if (names.length > 0) captions.set(id, copy.photographed.replace("{slots}", names.join(", ")));
    }
    return captions;
  } catch {
    return captions;
  }
}
