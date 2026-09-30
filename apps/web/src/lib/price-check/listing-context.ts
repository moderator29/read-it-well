import type { Listing } from "../listings/types";
import { emptySubject } from "./address";
import { isSupportedType } from "./gate";
import type { ListingPropertyType, PriceCheckSubject, RentPeriod } from "./types";

/**
 * B8: "HOW DOES THIS PRICE COMPARE?" ON THE LISTING. Pure.
 *
 * The listing's own facts, turned into the Price Check subject and the deep
 * link the `/price` page already reads (`state`, `area`, `lat`, `lng`,
 * `type`, `intent`, `period`, `beds`), so the answer arrives with the HTML
 * and nobody retypes anything.
 *
 * NOTHING ABOUT THE RESULT IS PAINTED ON THE LISTING. The row is a door to
 * the tool; the listing never shows a band beside a price the tool did not
 * judge. And the door is drawn only where the tool would answer: an example
 * listing (comparables exclude `is_demo`), a listing with no pin, a type or
 * period the tool does not price, or an area with too few similar listings
 * all draw nothing (`subjectForListing` returns null for the first three and
 * the gate refuses the last).
 */

type Facts = Pick<
  Listing,
  "id" | "kind" | "area" | "city" | "stateCode" | "lat" | "lng" | "intent" | "pricePeriod" | "bedrooms" | "sizeSqm" | "isDemo"
>;

function periodOf(listing: Facts): RentPeriod | null {
  const p = listing.pricePeriod;
  return p === "month" || p === "quarter" || p === "year" ? p : null;
}

/** The Price Check subject for this listing, or null when the tool cannot ask. */
export function subjectForListing(listing: Facts): PriceCheckSubject | null {
  if (listing.isDemo) return null;
  if (typeof listing.lat !== "number" || typeof listing.lng !== "number") return null;
  if (!Number.isFinite(listing.lat) || !Number.isFinite(listing.lng)) return null;
  const type = listing.kind as ListingPropertyType;
  if (!isSupportedType(type)) return null;
  const intent = listing.intent === "sale" ? "sale" : "rent";
  const period = periodOf(listing);
  /* The asking figures are yearly; a monthly or nightly price is not what
     the tool compares, so the door is not drawn rather than mislead. */
  if (intent === "rent" && period !== "year") return null;
  return {
    ...emptySubject(listing.stateCode ?? ""),
    lat: listing.lat,
    lng: listing.lng,
    area: listing.area || null,
    city: listing.city || null,
    propertyType: type,
    intent,
    rentPeriod: "year",
    bedrooms: Number.isFinite(listing.bedrooms) ? Math.round(listing.bedrooms) : null,
    sizeSqm: typeof listing.sizeSqm === "number" && listing.sizeSqm > 0 ? listing.sizeSqm : null,
    fromListingId: listing.id,
  };
}

/** The `/price` deep link for a subject, in the parameters the page reads. */
export function priceCheckHref(subject: PriceCheckSubject): string {
  const params = new URLSearchParams();
  if (subject.stateCode) params.set("state", subject.stateCode);
  if (subject.area) params.set("area", subject.area);
  if (subject.lat !== null) params.set("lat", String(subject.lat));
  if (subject.lng !== null) params.set("lng", String(subject.lng));
  params.set("type", subject.propertyType);
  params.set("intent", subject.intent);
  if (subject.intent === "rent") params.set("period", subject.rentPeriod);
  if (subject.bedrooms !== null) params.set("beds", String(subject.bedrooms));
  if (subject.sizeSqm !== null) params.set("size", String(subject.sizeSqm));
  return `/price?${params.toString()}`;
}
