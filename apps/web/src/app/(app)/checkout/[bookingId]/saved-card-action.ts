"use server";

import { payWithSavedCard } from "@/lib/bookings/checkout";
import type { ActionResult } from "@/lib/actions/envelope";
import type { ChargeSavedCardOutcome } from "@/lib/payments/charge-saved-card";

/**
 * The saved-card charge, bound to one booking and one idempotency key by the
 * checkout page and handed to `PayPanel` as its `chargeSavedCard` prop.
 *
 * The page binds the first two arguments with `.bind`, so the client only
 * ever names the card. The booking and the key travel as bound arguments of
 * the action, never as something the browser can rewrite.
 */
export async function chargeSavedCardFor(
  bookingId: string,
  idempotencyKey: string,
  methodId: string,
): Promise<ActionResult<ChargeSavedCardOutcome>> {
  return payWithSavedCard({ bookingId, methodId, idempotencyKey });
}
