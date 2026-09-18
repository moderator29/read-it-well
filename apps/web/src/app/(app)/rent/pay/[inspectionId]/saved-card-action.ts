"use server";

import { payRentWithSavedCard } from "@/lib/rent/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import type { ChargeSavedCardOutcome } from "@/lib/payments/charge-saved-card";

/**
 * The saved-card charge, bound to one inspection and one idempotency key by
 * the rent payment page and handed to `PayPanel` as its `chargeSavedCard`
 * prop. The page binds the first two arguments with `.bind`, so the client
 * only ever names the card; the booking behind the inspection is resolved on
 * the server under the tenant's own RLS.
 */
export async function chargeRentSavedCardFor(
  inspectionId: string,
  idempotencyKey: string,
  methodId: string,
): Promise<ActionResult<ChargeSavedCardOutcome>> {
  return payRentWithSavedCard({ inspectionId, methodId, idempotencyKey });
}
