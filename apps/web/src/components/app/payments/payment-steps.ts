/**
 * The payment's steps as data, pure and client-safe, so the unit project can
 * test the mapping from a real phase to what `PaymentSteps` draws.
 */
export type PaymentStepState = "done" | "active" | "waiting";
export type PaymentStep = { key: string; label: string; state: PaymentStepState };

/**
 * The three steps of an in-app card payment, from the checkout's own phase.
 * Pure, so the mapping from a real phase to what is drawn is tested rather
 * than trusted: "opening" is waiting on Paystack's window to load, "settling"
 * means the window loaded and the payment is being confirmed against our own
 * transaction record. "Received" is never drawn done here, because the moment
 * it is true the caller replaces this sheet with the receipt.
 */
export function cardPaymentSteps(
  phase: "opening" | "settling",
  labels: { opening: string; confirming: string; received: string },
): PaymentStep[] {
  return [
    { key: "opening", label: labels.opening, state: phase === "opening" ? "active" : "done" },
    { key: "confirming", label: labels.confirming, state: phase === "settling" ? "active" : "waiting" },
    { key: "received", label: labels.received, state: "waiting" },
  ];
}
