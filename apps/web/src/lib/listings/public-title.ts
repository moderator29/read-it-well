import { KIND_NOUN } from "./search-params";
import type { Listing } from "./types";

/**
 * STORE-16: WHAT A LISTING IS CALLED ANYWHERE IT TRAVELS.
 *
 * A listing's own title is the lister's free text, and a lister can write a
 * street into it ("… on Chevron Drive"). The rule is that no share artefact
 * carries a specific address, so everything that leaves the page (the share
 * sheet, the tab title, the link preview) is built from structured fields
 * only: the kind, the bedroom count and the area and city the lister chose
 * from a list. "3-bedroom rental in Yaba, Lagos".
 */
const COUNTS_BEDROOMS = new Set<Listing["kind"]>(["apartment", "home", "shortlet", "villa", "rental"]);

export function publicListingTitle(
  listing: Pick<Listing, "kind" | "bedrooms" | "area" | "city">,
): string {
  const noun = KIND_NOUN[listing.kind]?.one ?? "place";
  const place = listing.area && listing.area !== listing.city ? `${listing.area}, ${listing.city}` : listing.city;
  const beds = COUNTS_BEDROOMS.has(listing.kind) && listing.bedrooms > 0 ? `${listing.bedrooms}-bedroom ` : "";
  const head = `${beds}${noun}`;
  const phrase = place ? `${head} in ${place}` : head;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/**
 * A house number followed by a street word: "3 Adeola Odeku Street",
 * "12B Admiralty Way". The title is shown to everybody; the exact address is
 * shared only after a booking, so a title that carries one is refused.
 */
const STREET_ADDRESS =
  /\b\d+[a-z]?\s+(?:[a-z'.-]+\s+){0,4}(?:street|st|road|rd|close|avenue|ave|crescent|cres|drive|dr|lane|ln|way|estate|boulevard|blvd|place|court|ct)\b/i;

export function namesAStreetAddress(title: string): boolean {
  return STREET_ADDRESS.test(title);
}

export const STREET_IN_TITLE_MESSAGE =
  "Leave the street address out of the title. Everybody can read the title; the exact address is shared only after a booking.";
