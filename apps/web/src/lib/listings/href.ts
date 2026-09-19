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
 * `listing.kind` and of nothing else, and there is no prop left to forget.
 *
 * THE THREE DESTINATIONS.
 *
 *   `/stay/<id>`        the nightly lodging kinds. `hotel`, `shortlet`,
 *                       `villa` and `apartment` are priced per night and
 *                       reserved, which is the Stays side by definition.
 *   `/restaurant/<id>`  a table is booked, not slept in, and it has its own
 *                       shell on the Stays side.
 *   `/listing/<id>`     everything else: `home`, `rental`, `land`, `shop`,
 *                       `office` and `experience`. Annual tenancies and
 *                       sales, arranged with an agent and inspected. The
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
 * The kinds that are slept in by the night. Named rather than inlined so a
 * new lodging kind is added in one place and every surface follows.
 */
const STAY_KINDS = new Set<ListingKind>(["hotel", "shortlet", "villa", "apartment"]);

export function isStayKind(kind: ListingKind): boolean {
  return STAY_KINDS.has(kind);
}

export function hrefForListing(kind: ListingKind, id: string): string {
  if (kind === "restaurant") return `/restaurant/${id}`;
  if (isStayKind(kind)) return `/stay/${id}`;
  return `/listing/${id}`;
}
