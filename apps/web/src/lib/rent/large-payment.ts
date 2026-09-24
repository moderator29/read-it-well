import { MAX_MOVE_KOBO } from "../wallet/schema";

/**
 * V-25. The pay panel knows the amount is large.
 *
 * A Banana Island move-in is ₦36.3m. Most Nigerian cards carry daily limits far
 * below that, and the wallet moves at most `MAX_MOVE_KOBO` (₦10m) in one
 * movement. A tenant who tries the card, is refused, and tries again is the
 * tenant who goes back to paying the agent by transfer at the gate. So above
 * a threshold the panel leads with bank transfer and says why, and above the
 * wallet's ceiling the wallet is not offered as a route at all, instead of
 * failing after a top-up.
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
  /** Offer the wallet as a route at all. False above the wallet's ceiling. */
  walletOffered: boolean;
  /** The wallet's ceiling, for the sentence that says why it is not offered. */
  walletLimitMinor: number;
};

export function payRoutes(totalMinor: number): PayRoutes {
  const total = Number.isSafeInteger(totalMinor) && totalMinor > 0 ? totalMinor : 0;
  return {
    leadWithTransfer: total > LARGE_PAYMENT_KOBO,
    walletOffered: total <= MAX_MOVE_KOBO,
    walletLimitMinor: MAX_MOVE_KOBO,
  };
}
