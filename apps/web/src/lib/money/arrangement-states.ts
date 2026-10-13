/**
 * D73 Part B (phases 11 and 12): the states of a protected rental payment,
 * which the licensed provider (Payluk escrow) holds and Vallo records.
 *
 * Vallo's state is kept apart from the provider's (founder section 54): the
 * provider's `state` and `status` words are stored as they were said, and this
 * file maps them onto Vallo's. The step table is the twin of
 * `private.provider_arrangement_step_ok` in migration d73b_provider_arrangements;
 * `arrangement-states.test.ts` holds them to the same rows.
 */

export const ARRANGEMENT_STATUSES = [
  "preparing",
  "unknown",
  "failed",
  "awaiting_payment",
  "payment_processing",
  "protected",
  "release_requested",
  "released",
  "disputed",
  "refunded",
  "split",
  "cancelled",
] as const;

export type ArrangementStatus = (typeof ARRANGEMENT_STATUSES)[number];

/** Where each state may go. Nothing leaves a final state. */
export const ARRANGEMENT_STEPS: Readonly<Record<ArrangementStatus, readonly ArrangementStatus[]>> = {
  preparing: ["unknown", "failed", "awaiting_payment"],
  unknown: ["failed", "awaiting_payment", "payment_processing", "protected", "disputed", "released", "refunded", "split", "cancelled"],
  awaiting_payment: ["payment_processing", "protected", "disputed", "released", "refunded", "split", "cancelled"],
  payment_processing: ["awaiting_payment", "protected", "disputed", "released", "refunded", "split"],
  protected: ["release_requested", "disputed", "released", "refunded", "split"],
  release_requested: ["protected", "disputed", "released", "refunded", "split"],
  disputed: ["released", "refunded", "split"],
  released: [],
  refunded: [],
  split: [],
  failed: [],
  cancelled: [],
};

export function stepAllowed(from: ArrangementStatus, to: ArrangementStatus): boolean {
  return ARRANGEMENT_STEPS[from].includes(to);
}

export const FINAL_ARRANGEMENT_STATUSES: readonly ArrangementStatus[] = ["released", "refunded", "split", "failed", "cancelled"];

/**
 * The provider's `state` and `status` (concepts_escrow-lifecycle,
 * concepts_webhooks) onto Vallo's state. Null for a pair the docs do not
 * describe: the report is recorded and nothing moves.
 *
 *   AWAITING_PAYMENT / PENDING           -> awaiting_payment
 *   OPENED / ONGOING                     -> protected (funded, held by the provider)
 *   OPENED / DISPUTED or INVESTIGATING   -> disputed
 *   CLOSED / COMPLETED or CLAIMED        -> released (to the lister)
 *   CLOSED / REFUNDED                    -> refunded (to the renter)
 *   CLOSED / SPLIT                       -> split
 */
export function valloStateFor(providerState: string, providerStatus: string): ArrangementStatus | null {
  const state = providerState.trim().toUpperCase();
  const status = providerStatus.trim().toUpperCase();
  if (state === "AWAITING_PAYMENT" && status === "PENDING") return "awaiting_payment";
  if (state === "OPENED" && status === "ONGOING") return "protected";
  if (state === "OPENED" && (status === "DISPUTED" || status === "INVESTIGATING")) return "disputed";
  if (state === "CLOSED" && (status === "COMPLETED" || status === "CLAIMED")) return "released";
  if (state === "CLOSED" && status === "REFUNDED") return "refunded";
  if (state === "CLOSED" && status === "SPLIT") return "split";
  return null;
}

/**
 * The delivery window Payluk is told, in days: from today (Lagos) to the
 * move-in date, plus the Guarantee claim window for the move-in inspection.
 * It matters because one day after the window the lister may claim the money
 * without the renter's confirmation (concepts_escrow-lifecycle, CLAIMED).
 * Null when the move-in date is missing, unreadable, or too far away for the
 * provider's 365 day limit.
 */
export function deliveryWindowDays(moveIn: string | null | undefined, todayLagos: string, claimWindowDays = 3): number | null {
  if (!moveIn || !/^\d{4}-\d{2}-\d{2}$/.test(moveIn) || !/^\d{4}-\d{2}-\d{2}$/.test(todayLagos)) return null;
  const days = Math.round((Date.parse(`${moveIn}T00:00:00Z`) - Date.parse(`${todayLagos}T00:00:00Z`)) / 86_400_000);
  if (!Number.isFinite(days)) return null;
  const window = Math.max(0, days) + claimWindowDays;
  return window >= 1 && window <= 365 ? window : null;
}
