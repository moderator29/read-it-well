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
 * A HOUSE NUMBER AND A NAMED STREET: "3 Adeola Odeku Street", "12B Admiralty
 * Way". Everybody can read a title and the exact address is shared only after
 * a booking, so a title that looks like one gets a WARNING to the lister. It
 * is never a refusal: ordinary titles are full of numbers and of the words
 * "close" and "way", and a false refusal blocks somebody from listing at all.
 *
 * The shape, tuned against real titles:
 * - the number is not a count ("3 bedroom", "5 minutes", "2 units");
 * - the words between it and the street word are Capitalised, a name;
 * - the street word is Capitalised and is a street type used in Nigerian
 *   addresses. "Estate", "Place" and "Court" are left out: they name
 *   developments far more often than streets.
 */
const COUNT_WORD =
  "(?:bed|beds|bedroom|bedrooms|bedroomed|br|room|rooms|flat|flats|unit|units|min|mins|minute|minutes|km|plot|plots|storey|storeys|floor|floors|toilet|toilets|bath|baths|bathroom|bathrooms|sqm|acre|acres|hectare|hectares)";
const STREET_ADDRESS = new RegExp(
  String.raw`(?:^|[\s,(])\d{1,4}[A-Za-z]?(?!\s*${COUNT_WORD}\b)(?:,)?\s+(?:[A-Z][\w'.-]*\s+){1,4}(?:Street|St|Road|Rd|Close|Avenue|Ave|Crescent|Cres|Drive|Dr|Lane|Ln|Way|Boulevard|Blvd)\b\.?`,
);

export function looksLikeStreetAddress(title: string): boolean {
  return STREET_ADDRESS.test(title);
}

export const STREET_IN_TITLE_WARNING =
  "This looks like a street address. Everybody can read the title, and the exact address is shared only after a booking, so consider leaving the house number out.";
