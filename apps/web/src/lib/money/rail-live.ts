import "server-only";

import { escrowRailLive } from "../payments/providers";

/**
 * THE SERVER'S ANSWER TO "CAN ESCROW WORK RIGHT NOW?" (replaces the constant
 * PROTECTED_RAIL_LIVE, founder instruction of 13 October 2026).
 *
 * True only when all of these hold, read at request time:
 *  - a Payluk key is configured for this deployment (`paylukMerchantConfig`:
 *    the live key in production only, the test key on previews and staging);
 *  - `PAYMENTS_KILL_PAYLUK` is not `1` (the outage stop, no database needed);
 *  - `payments_payluk_on` is on (fail closed: a failed read is off).
 * Any error is false: escrow is then simply not offered, and a payer who may
 * pay by card is offered card.
 */
export async function protectedRailLive(): Promise<boolean> {
  try {
    return await escrowRailLive();
  } catch {
    return false;
  }
}
