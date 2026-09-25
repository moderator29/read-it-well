import "server-only";

/**
 * V-56 AND V-92, RETIRED (Track A, 25 September 2026).
 *
 * V-56 held a move-in's agency fee in a held payment until the keys were
 * received; V-92 held a shortlet caution on the guest's wallet until 48 hours
 * after check-out. Both were Vallo holding a customer's money pending a later
 * release decision, which is exactly what Vallo no longer does. The trust job
 * they did is the Vallo Guarantee's now: a claim in the window after move-in
 * or check-in, decided by a person, paid from the separate reserve.
 *
 * The switches are not read. Both answers are false, permanently, so no row in
 * `feature_flags` can turn either hold back on.
 */
export const RENT_AGENCY_HOLD_FLAG = "rent_agency_hold";
export const STAY_CAUTION_HOLD_FLAG = "stay_caution_hold";

export async function agencyHoldIsOpen(): Promise<false> {
  return false;
}

export async function stayCautionHoldIsOpen(): Promise<false> {
  return false;
}
