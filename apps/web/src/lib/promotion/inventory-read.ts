import "server-only";

import type { FrontDoorDay } from "./front-door";
import type { FrontDoorTierSlug } from "./tiers";

/**
 * THE FRONT DOOR'S DAY, PER TIER, AS THE PURCHASE SCREEN READS IT.
 *
 * ===========================================================================
 * STUB, PENDING SESSION 2 (the promotion inventory and the sale). There is
 * no inventory in the database yet, so this answers `not-live` and reads
 * nothing; the purchase screen then states the published count and says
 * nothing about a day. When Session 2's read lands, this body returns, per
 * front door tier and the requested Lagos day, `open` with the free places,
 * or `full` with the named reason and the next free day (`FrontDoorDay`); the
 * screen does not change.
 * ===========================================================================
 */
export async function readFrontDoorDays(listingId: string): Promise<Record<FrontDoorTierSlug, FrontDoorDay>> {
  void listingId;
  return { featured: { state: "not-live" }, prime: { state: "not-live" } };
}
