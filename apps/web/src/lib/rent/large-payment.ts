import { MAX_MOVE_KOBO } from "../wallet/schema";

/**
 * V-25. The pay panel knows the amount is large.
 *
 * A Banana Island move-in is ₦36.3m. Most Nigerian cards carry daily limits far
 * below that, and a wallet TOP-UP moves at most `MAX_MOVE_KOBO` (₦10m) in one
 * movement. A tenant who tries the card, is refused, and tries again is the
 * tenant who goes back to paying the agent by transfer at the gate. So above
 * a threshold the panel leads with bank transfer and says why. Paying FROM the
 * wallet has no such cap (`pay_booking_from_wallet` charges any covered
 * amount), so a wallet that already covers the total is always offered; only
 * the route "top the wallet up to this, then pay" is withdrawn above the
 * ceiling, instead of failing after a top-up.
 *
 * Bank transfer appears on the payment page only while the channel is enabled
 * on the Paystack merchant account; nothing here narrows the channels.
 *
 * THE THRESHOLD IS THE FOUNDER'S NUMBER. ₦500,000 is the figure the entry
 * suggests; it lives here as one constant so changing it is one line.
 * Raising the wallet ceiling instead was considered and rejected: a larger
 * blast radius for every other wallet movement (see A2-052).
 *
 * Pure, integer kobo, no division.
 */
export const LARGE_PAYMENT_KOBO = 500_000_00;

export type PayRoutes = {
  /** Lead with bank transfer and explain the card limit. */
  leadWithTransfer: boolean;
  /** Offer the wallet as a route. False only when it does not cover the total and a top-up could not reach it. */
  walletOffered: boolean;
  /** The wallet's ceiling, for the sentence that says why it is not offered. */
  walletLimitMinor: number;
};

export function payRoutes(totalMinor: number, walletCovers = false): PayRoutes {
  const total = Number.isSafeInteger(totalMinor) && totalMinor > 0 ? totalMinor : 0;
  return {
    leadWithTransfer: total > LARGE_PAYMENT_KOBO,
    walletOffered: walletCovers || total <= MAX_MOVE_KOBO,
    walletLimitMinor: MAX_MOVE_KOBO,
  };
}
