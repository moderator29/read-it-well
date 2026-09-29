/**
 * WHEN A CARD PAYMENT MAY BE CELEBRATED (docs/SUCCESS_MOMENTS.md).
 *
 * `settleCardPayment` answers `ok` for more than a payment: a reference seen
 * before, a flatmate's share, a settlement against a different booking of the
 * same person. The success sheet opens only on the answers below, and every
 * other `ok` keeps the honest "we are confirming your payment" sheet.
 *
 * Pure, so the rule is tested without a processor or a database.
 */
export type CardReturnFacts = {
  bookingId: string;
  confirmed: boolean;
  outcome?: "settled" | "already-settled" | "share-settled";
  transactionStatus?: string | null;
};

export type CardReturnVerdict =
  /** This call settled it and moved the booking to CONFIRMED. */
  | "paid-confirmed"
  /** Paid and recorded against this booking, confirmed earlier or awaiting the agent. */
  | "paid"
  /** A flatmate's share settled; the move-in is not complete. */
  | "share-paid"
  /** Anything else: not a thing to celebrate. */
  | "unsure";

export function cardReturnVerdict(facts: CardReturnFacts, expectedBookingId: string): CardReturnVerdict {
  /* A reference from another of this person's bookings pasted onto this
     page is settled against ITS booking, not this one. */
  if (facts.bookingId !== expectedBookingId) return "unsure";
  switch (facts.outcome) {
    case "settled":
      return facts.confirmed ? "paid-confirmed" : "paid";
    case "already-settled":
      return facts.transactionStatus === "SUCCESSFUL" ? "paid" : "unsure";
    case "share-settled":
      return "share-paid";
    default:
      /* An older answer with no outcome says nothing either way. */
      return "unsure";
  }
}
