import type { RailMovement } from "../payments/provider";
import { movementKindFor, movementStatusForProvider, type MovementKind, type MovementStatus } from "./funds";

/**
 * WHAT ONE SIGNED `payment.*` DELIVERY DOES TO VALLO'S RECORD (phase 15).
 * Pure, so every branch is a test; the route only carries it out.
 *
 *  - A movement Vallo started: the provider's outcome becomes its status,
 *    unless the amount or the customer disagree with what Vallo asked for,
 *    in which case a person looks (`under_review`) and nothing is shown done.
 *  - A movement Vallo did not start but that belongs to one of its members
 *    (money sent to them by another member, a deposit made elsewhere): it is
 *    recorded as the provider reported it, keyed on the provider's reference.
 *  - Anything else (Vallo's own merchant commission, an unknown customer):
 *    acknowledged and recorded, never applied.
 */
export type EventDecision =
  | { kind: "observe"; to: MovementStatus; detail: Record<string, unknown> }
  | { kind: "mirror"; userId: string; movementKind: MovementKind; status: MovementStatus }
  | { kind: "ignore"; reason: string };

export type KnownMovement = { amountMinor: number; ownerCustomerId: string | null };

export function outcomeStatus(outcome: "success" | "failed" | "reversed" | "other", providerWord: string): MovementStatus {
  if (outcome === "other") return movementStatusForProvider(providerWord);
  return outcome === "success" ? "completed" : outcome;
}

export function decidePaymentEvent(
  w: { outcome: "success" | "failed" | "reversed" | "other"; movement: RailMovement },
  known: KnownMovement | null,
  memberForCustomer: string | null,
): EventDecision {
  const to = outcomeStatus(w.outcome, w.movement.status);
  if (known) {
    if (known.ownerCustomerId !== null && w.movement.customerId !== null && known.ownerCustomerId !== w.movement.customerId) {
      return { kind: "observe", to: "under_review", detail: { reason: "customer_mismatch" } };
    }
    if (known.amountMinor !== w.movement.amountMinor) {
      return { kind: "observe", to: "under_review", detail: { reason: "amount_mismatch", provider_amount_minor: w.movement.amountMinor } };
    }
    return { kind: "observe", to, detail: {} };
  }
  if (!memberForCustomer) return { kind: "ignore", reason: w.movement.customerId ? "not_a_member" : "no_customer" };
  return { kind: "mirror", userId: memberForCustomer, movementKind: movementKindFor(w.movement.type, w.movement.direction), status: to };
}
