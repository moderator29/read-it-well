/**
 * V-25. The pay panel knows the amount is large.
 *
 * A Banana Island move-in is ₦36.3m. Most Nigerian cards carry daily limits far
 * below that. A tenant who tries the card, is refused, and tries again is the
 * tenant who goes back to paying the agent by transfer at the gate. So above
 * a threshold the panel leads with bank transfer (through the same Paystack
 * checkout, with the same split, so the money still goes straight to the
 * lister) and says why.
 *
 * There is no wallet route any more (Track A, 25 September 2026: Vallo never
 * holds customer money), so the only question left is whether to lead with
 * transfer.
 *
 * THE THRESHOLD IS THE FOUNDER'S NUMBER. ₦500,000 is the figure the entry
 * suggests; it lives here as one constant so changing it is one line.
 *
 * Pure, integer kobo, no division.
 */
export const LARGE_PAYMENT_KOBO = 500_000_00;

export type PayRoutes = {
  /** Lead with bank transfer and explain the card limit. */
  leadWithTransfer: boolean;
};

export function payRoutes(totalMinor: number): PayRoutes {
  const total = Number.isSafeInteger(totalMinor) && totalMinor > 0 ? totalMinor : 0;
  return { leadWithTransfer: total > LARGE_PAYMENT_KOBO };
}
