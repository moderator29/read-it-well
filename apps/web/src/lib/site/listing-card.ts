import type { Dictionary } from "@vallo/i18n/core";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { PERIOD_SUFFIX_SHORT } from "@/lib/listings/pricing";

/**
 * The shape a listing takes on the landing page's floating cards.
 *
 * A `Listing` is a large server record; the hero pager is a client component,
 * and only the handful of fields a card prints should cross that boundary.
 * The mapper also settles the two honesty questions once, here, rather than
 * in every card: what the price is per (read off `pricePeriod`, never
 * guessed) and what the badge says ("Example" when the record is an example
 * listing; `verified` only when the record says the lister was checked by a
 * person; otherwise the market, which is a fact).
 */
import { isModestExample } from "@/lib/listings/example-imagery";

export type MiniListing = {
  id: string;
  href: string;
  title: string;
  place: string;
  priceMinor: number;
  currency: "NGN";
  suffix: string;
  photo: string | null;
  hue: number;
  kind: ListingKind;
  verified: boolean;
  /** An example listing (`listing.isDemo`): the card says "Example" in place
      of the market or the tick, as every card renderer in the product must
      (`components/app/listing/example-notice.test.ts`). */
  example: boolean;
  market: string;
  /** A modest example: draw its kind, never a scene photograph (`example-imagery.ts`). */
  drawn?: boolean;
};

export function toMiniListing(listing: Listing, t: Dictionary): MiniListing {
  const period = listing.pricePeriod;
  const market =
    period === "night"
      ? t.landing.card.market.night
      : period === "guest"
        ? t.landing.card.market.head
        : period
          ? t.landing.card.market.rent
          : t.landing.card.market.sale;
  return {
    id: listing.id,
    href: `/listing/${listing.id}`,
    title: listing.title,
    place: listing.area ? `${listing.area}, ${listing.city}` : listing.city,
    priceMinor: listing.priceMinor,
    currency: listing.currency,
    suffix: period ? PERIOD_SUFFIX_SHORT[period] : "",
    photo: listing.photos[0] ?? null,
    hue: listing.hue,
    kind: listing.kind,
    verified: listing.verified,
    example: listing.isDemo === true,
    market,
    drawn: isModestExample(listing),
  };
}
