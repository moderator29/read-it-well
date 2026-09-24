import { marketOf, type MarketFacts } from "./market";
import type { ListingKind } from "./types";

/**
 * Where a listing opens, decided by WHAT IT IS.
 *
 * ---------------------------------------------------------------------------
 * THIS EXISTS BECAUSE A PROP NOBODY PASSED BROKE THE SIDE LAW ON THE BUSIEST
 * SURFACE IN THE PRODUCT.
 *
 * `ListingCard` built its href as `side === "stays" ? "/stay" : "/listing"`,
 * `side` defaulted to `"property"`, and not one call site in the tree passed
 * it: not `/search`, not `/saved`, not `/rent`. Meanwhile the property
 * search's own category rail offers Shortlets, Apartments, Villas and Hotels
 * as tiles. So tapping Hotels and then tapping a hotel landed on
 * `/listing/<id>`, which `sideOfPath` classifies as Property, and a Stays
 * object opened inside the Property shell. A saved hotel did the same thing
 * from the shortlist. (R2 finding 1, confirmed; DESIGN_DIRECTION section 3
 * and BUILD_06 ledger 10.4.)
 *
 * The fix is not to thread the prop through three more pages. It is to stop
 * asking the caller a question the DATA already answers. A hotel is a stay
 * wherever it is drawn - on the property search, on the shortlist, in a chat
 * card, in an assistant recommendation - so the destination is a function of
 * the listing's own data, and there is no prop left to forget.
 *
 * THE THREE DESTINATIONS, by market (`lib/listings/market.ts`).
 *
 *   `/stay/<id>`        a stay by the night: a rate per night, or a nightly
 *                       kind (`hotel`, `shortlet`, `villa`, `apartment`) with
 *                       no stated price.
 *   `/restaurant/<id>`  a table, priced per head. It has its own shell on the
 *                       Stays side.
 *   `/listing/<id>`     everything let on a tenancy or sold, whatever the
 *                       kind: a villa let by the year is a tenancy. The
 *                       Property side.
 *
 * `/stay/[id]` falls through to the listing page when no accommodation row
 * exists yet, so a hotel whose host has not finished onboarding still opens
 * rather than 404ing; nothing here depends on the stays tables being full.
 *
 * Exported from `lib` rather than from a component so the assistant's cards,
 * the stays surfaces and the forwardable chat cards all reach the same
 * answer. Two places deciding this is how the first one drifted.
 */

/**
 * The kinds that are slept in by the night, when nothing else is known. Named
 * rather than inlined so a new lodging kind is added in one place.
 */
const STAY_KINDS = new Set<ListingKind>(["hotel", "shortlet", "villa", "apartment"]);

export function isStayKind(kind: ListingKind): boolean {
  return STAY_KINDS.has(kind);
}

/**
 * UX-10 / UI-P2-03: the destination follows the MARKET (`marketOf`), not the
 * kind alone. A villa or apartment let by the year is a tenancy and opens on
 * `/listing/<id>`; restaurant premises let on a rent do too. A caller that has
 * only the kind (an old assistant card) still gets the kind's default.
 */
export function hrefForListing(
  kind: ListingKind,
  id: string,
  facts: Omit<MarketFacts, "kind"> = {},
): string {
  const market = marketOf({ kind, ...facts });
  if (market === "dining") return `/restaurant/${id}`;
  if (market === "stay") return `/stay/${id}`;
  return `/listing/${id}`;
}

/** The facts `hrefForListing` needs, off a listing. */
export function marketFactsOf(listing: {
  intent?: MarketFacts["intent"];
  pricePeriod?: MarketFacts["pricePeriod"];
  priceMinor?: number;
}): Omit<MarketFacts, "kind"> {
  return { intent: listing.intent, pricePeriod: listing.pricePeriod, priceMinor: listing.priceMinor };
}
