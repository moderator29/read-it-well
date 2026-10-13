import type { Dictionary } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import type { ListerRoleWord } from "@/lib/inspections/visit";
import type { VisitProperty } from "./VisitPropertyCard";

/**
 * The listing as the visit screens draw it, and the role words, from the
 * one listing read the page makes (`listingById`). Server and client safe.
 */
const PERIOD: Record<string, "perYear" | "perMonth" | "perQuarter"> = {
  year: "perYear",
  month: "perMonth",
  quarter: "perQuarter",
};

export function visitPropertyOf(listing: Listing, card: Pick<Dictionary["catalogue"]["card"], "perYear" | "perMonth" | "perQuarter">): VisitProperty {
  const key = listing.intent === "sale" || !listing.pricePeriod ? undefined : PERIOD[listing.pricePeriod];
  return {
    title: listing.title,
    area: listing.area,
    city: listing.city,
    photo: listing.photos[0] ?? null,
    priceMinor: listing.intent === "sale" ? (listing.salePriceMinor ?? listing.priceMinor) : listing.priceMinor,
    currency: listing.currency,
    period: key ? card[key] : "",
    spokenPeriod: key ? (listing.pricePeriod as "year" | "month" | "quarter") : null,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sizeSqm: listing.sizeSqm ?? null,
  };
}

/** The card's role label ("Landlord") and the sentence noun ("owner"). */
export function roleWordsOf(
  role: ListerRoleWord | null,
  labels: Pick<Dictionary["socialProfile"]["roleLine"], "landlord" | "agent" | "agency">,
  nouns: Dictionary["visit"]["roleNoun"],
): { label: string | null; noun: string | null } {
  if (!role) return { label: null, noun: null };
  return { label: labels[role], noun: nouns[role] };
}

/** Area and state for the calendar file's location: never a street. */
export function visitPlaceOf(listing: Pick<Listing, "area" | "city" | "state">): string {
  return [listing.area, listing.state || listing.city].filter((part, i, all) => part && all.indexOf(part) === i).join(", ");
}
