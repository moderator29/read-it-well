/**
 * WHERE PROMOTION IS OPENED FROM, IN ONE PLACE.
 *
 * A listing's promotion screen (`/agent/listings/<id>/promotion`) was built
 * and linked from nowhere, so the founder could not find it. It has two doors
 * now: the Promote action on a live listing's row in the listings workspace,
 * and `/agent/promotion`, which the workspace rail and the dashboard open.
 * Both build the address here, so the route is spelled once and
 * `measurement.test.ts` can hold every link to it to this file.
 *
 * Opening it never buys anything: buying says it is not on sale until
 * payments for promotion are live (`PROMOTION_NOT_ON_SALE`).
 */

/** The workspace's door into promotion: the lister's live listings. */
export const PROMOTION_HUB_HREF = "/agent/promotion";

/** One listing's promotion screen. */
export function promotionHref(listingId: string): string {
  return `/agent/listings/${encodeURIComponent(listingId)}/promotion`;
}

/** Promotion is offered on a listing a renter can see, and on nothing else. */
export function canPromote(listing: { status: string }): boolean {
  return listing.status === "PUBLISHED";
}
