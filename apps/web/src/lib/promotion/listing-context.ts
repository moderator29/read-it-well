/**
 * WHICH LISTING PROMOTION'S FIRST RUN WAS OPENED FROM.
 *
 * The run is gated in front of a listing's promotion screen
 * (`gateFirstRun` on `/agent/listings/<id>/promotion`), which hands that
 * screen over as the run's already-checked `next`. The listing is read from
 * there and nowhere else, so the run never takes a listing id a link could
 * point at somebody else's listing: the read below it still checks the
 * listing is the signed-in lister's own. Anything else is no listing, and the
 * run says what it would show instead of inventing an example.
 */
const PROMOTION_SCREEN =
  /^\/agent\/listings\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/promotion(?:[/?#]|$)/i;

export function promotionListingFrom(next: string | null | undefined): string | null {
  const match = PROMOTION_SCREEN.exec(next ?? "");
  return match ? match[1]!.toLowerCase() : null;
}
