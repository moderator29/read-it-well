import "server-only";

import type { PromotionMeasurementRead } from "./measurement";

/**
 * A LISTER'S PROMOTION RESULTS, READ.
 *
 * ===========================================================================
 * STUB, PENDING SESSION 2 (the promotion metrics read). There is no promotion
 * inventory, purchase or measurement in the database yet, and promotion
 * cannot be sold until the company payment account exists (D38, D60). So this
 * answers `not-live` for every listing and reads nothing. When Session 2's
 * read lands, this body calls it, scoped to the signed-in lister's own
 * listing, and returns `ready` with recorded counts only; the screen and the
 * model (`measurement.ts`) do not change.
 * ===========================================================================
 */
export async function readPromotionMeasurement(listingId: string): Promise<PromotionMeasurementRead> {
  void listingId;
  return { state: "not-live" };
}
