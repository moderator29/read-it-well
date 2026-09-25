import { isPropertyMarket, marketOf } from "../listings/market";
import type { ListingKind } from "../listings/types";
import type { PricePeriod } from "../listings/pricing";
import type { Side } from "../side.constants";
import type { ThreadContextKind } from "./db";

/**
 * WHICH SIDE A THREAD BELONGS TO (track G): the inbox splits into Property and
 * Stays the same way the shell does.
 *
 *   Stays     a table (reservation), a night (booking), a hotel or restaurant
 *             (business), and a listing thread about something slept in by
 *             the night or eaten at.
 *   Property  a listing thread about a let or a sale (tenancy and sale
 *             markets), which is also where tenancy conversations live.
 *
 * A listing thread whose listing cannot be read (withdrawn, or RLS) is a
 * Property thread: that is where every thread lived before the Stays side.
 */
export type ThreadListingFacts = {
  property_type: string;
  listing_intent: "rent" | "sale";
  rent_period: string | null;
  rate_period: string | null;
  rent_amount_minor: number | null;
  rate_minor: number | null;
};

export function threadSide(contextKind: ThreadContextKind | null | undefined, listing: ThreadListingFacts | null | undefined): Side {
  const kind = contextKind ?? "listing";
  if (kind === "reservation" || kind === "booking" || kind === "business") return "stays";
  if (!listing) return "property";
  const market = marketOf({
    kind: listing.property_type as ListingKind,
    intent: listing.listing_intent,
    pricePeriod: (listing.rent_period ?? listing.rate_period ?? undefined) as PricePeriod | undefined,
    priceMinor: listing.rent_amount_minor ?? listing.rate_minor ?? undefined,
  });
  return isPropertyMarket(market) ? "property" : "stays";
}
