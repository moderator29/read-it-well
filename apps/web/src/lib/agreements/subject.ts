import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ROOM BOOKINGS 1: what an agreement is about. A rent or listing-stay
 * agreement names a listing; a hotel room's names the hotel (its
 * accommodation). Every place that shows an agreement's subject reads it
 * through here, so a room stay is never shown as "Untitled listing".
 */
export type AgreementSubject = { listing_id: string | null; accommodation_id?: string | null };

/** The key a subject is looked up by. */
export function subjectKey(row: AgreementSubject): string {
  return row.listing_id ? `l:${row.listing_id}` : `a:${row.accommodation_id ?? ""}`;
}

/** Where the subject lives on the site. */
export function subjectHref(row: AgreementSubject): string {
  return row.listing_id ? `/listing/${row.listing_id}` : `/stay/${row.accommodation_id ?? ""}`;
}

/** The subjects' titles in two reads at most, keyed by `subjectKey`. */
export async function subjectTitles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any>,
  rows: AgreementSubject[],
): Promise<Map<string, string>> {
  const listingIds = [...new Set(rows.map((r) => r.listing_id).filter((id): id is string => Boolean(id)))];
  const placeIds = [
    ...new Set(rows.filter((r) => !r.listing_id).map((r) => r.accommodation_id).filter((id): id is string => Boolean(id))),
  ];
  const [listings, places] = await Promise.all([
    listingIds.length ? db.from("listings").select("id, title").in("id", listingIds) : Promise.resolve({ data: [] }),
    placeIds.length ? db.from("accommodations").select("id, name").in("id", placeIds) : Promise.resolve({ data: [] }),
  ]);
  const out = new Map<string, string>();
  for (const l of (listings.data ?? []) as { id: string; title: string | null }[]) out.set(`l:${l.id}`, l.title ?? "");
  for (const a of (places.data ?? []) as { id: string; name: string | null }[]) out.set(`a:${a.id}`, a.name ?? "");
  return out;
}
