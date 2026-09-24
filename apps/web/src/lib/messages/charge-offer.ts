import type { InspectionState } from "@/lib/inspections/types";

/**
 * THE REAL CHARGE, OFFERED AT THE MOMENT AN ACCOUNT NUMBER ARRIVES (V-04).
 *
 * The second half of the account-number card. The first half says whose
 * account it is; this half offers the thing to do instead of a transfer, at
 * exactly the second the temptation peaks:
 *
 *   pay       The renter holds an accepted inspection on this thread and the
 *             move-in charge is open and unpaid. The card names the figure
 *             and links to `/rent/pay/[inspectionId]`, the built charge.
 *   request   No accepted inspection yet, on a listing that is let. "Pay only
 *             after inspection. Request one here."
 *   none      The viewer is the lister, the listing is not a tenancy, or the
 *             move-in total has already been paid through Vallo. Nothing is
 *             offered, because an offer that cannot be taken is decoration.
 *
 * Pure: the page reads the facts and this decides. The one decision that
 * matters most is the first line of the function. An offer to pay is only
 * ever made to the person who requested the inspection, never to the lister,
 * and never on anybody's word but the inspection row's.
 *
 * WHEN HELD PAYMENTS OPEN, the entry adds an agency-fee version. That
 * surface is behind `held_payments` and owned by the escrow work; the kind is
 * not added here until it can be taken.
 */

export type ChargeOffer =
  | { kind: "pay"; inspectionId: string; totalMinor: number; currency: string }
  | { kind: "request"; listingId: string }
  | { kind: "none" };

export type ChargeOfferFacts = {
  viewerIsLister: boolean;
  listingId: string | null;
  /** The listing is let by the year, quarter or month. */
  listingIsTenancy: boolean;
  /** The viewer's own latest inspection on this thread, if any. */
  inspection: { id: string; state: InspectionState; outcome: string | null } | null;
  /** The rent charge as the pay page reads it, when the inspection is accepted. */
  charge: { totalMinor: number; currency: string; paid: boolean } | null;
};

/** Accepted is CONFIRMED, or COMPLETED without "no deal": the pay page's own rule. */
export function inspectionIsAccepted(state: InspectionState, outcome: string | null): boolean {
  if (state === "CONFIRMED") return true;
  return state === "COMPLETED" && (outcome ?? "inspected") !== "no_deal";
}

export function chargeOfferFrom(facts: ChargeOfferFacts): ChargeOffer {
  if (facts.viewerIsLister || !facts.listingId || !facts.listingIsTenancy) return { kind: "none" };
  const accepted =
    facts.inspection !== null && inspectionIsAccepted(facts.inspection.state, facts.inspection.outcome);
  if (accepted && facts.inspection) {
    if (!facts.charge || facts.charge.paid || !(facts.charge.totalMinor > 0)) return { kind: "none" };
    return {
      kind: "pay",
      inspectionId: facts.inspection.id,
      totalMinor: facts.charge.totalMinor,
      currency: facts.charge.currency,
    };
  }
  return { kind: "request", listingId: facts.listingId };
}
