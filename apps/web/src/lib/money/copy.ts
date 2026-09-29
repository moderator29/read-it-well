/**
 * THE SENTENCES THAT DESCRIBE HOW MONEY MOVES ON VALLO.
 *
 * Founder directive, 25 September 2026: Vallo never holds customer money.
 * There is no wallet, no balance, no held payment and nothing to withdraw.
 * When somebody pays, the processor splits the charge in the same
 * transaction: the owner's or agent's share to their own bank account, a
 * Guarantee contribution to a separate reserve, and Vallo's fee (zero today)
 * to Vallo. Every surface that explains money reads its words from here, so
 * the Terms, the help centre, the emails and the screens cannot drift apart.
 *
 * Client-safe: constants only.
 */

/** The one-line promise. */
export const NO_CUSTODY_SENTENCE =
  "Vallo never holds your money. When you pay, the owner's or agent's share goes straight to their bank account through our payment processor, in the same transaction.";

/** Where a refund goes. */
export const REFUND_ROUTE =
  "A refund goes back to the card or bank account you paid with, through our payment processor. Banks usually show it within 5 to 10 working days.";

/** For a lister: how and when they are paid. */
export const PAYOUT_ANSWER =
  "Your share of a payment settles straight to the bank account on your payout details, through Paystack, at the moment the renter or guest pays. Vallo never holds it, so there is nothing to withdraw. Paystack pays settled money into your bank on its normal settlement schedule.";

/** The Vallo Guarantee, in one paragraph. */
export const GUARANTEE_SENTENCE =
  "The Vallo Guarantee: between 1 and 2 percent of every payment is set aside in a separate reserve, kept apart from Vallo's own money. If something covered goes wrong, you can claim from it in the 72 hours after you move in or check in, up to what you paid for that booking. A person at Vallo reviews every claim before anything is paid.";

/** What the Guarantee covers at launch. */
export const GUARANTEE_SCOPE =
  "At launch the Guarantee covers rentals and stays paid through Vallo. It does not cover property purchases.";

/** Stated on the inspection screen itself, not only in a policy. */
export const NO_INSPECTION_FEE =
  "Vallo charges no inspection fee. Viewing a property through Vallo is free.";

/** The same promise as a heading, in the words the founder set for the screen. */
export const NO_INSPECTION_FEE_HEADLINE = "VALLO CHARGES NO INSPECTION FEE";

/** The companion to NO_INSPECTION_FEE: a private arrangement is not ours. */
export const PRIVATE_FEE_NOTE =
  "If an owner or agent asks you for a fee to inspect, that is a private arrangement between you and them. It is not a Vallo charge, Vallo does not collect it, and you can report it to us.";

/** Everything happens on the platform. */
export const OFF_PLATFORM_SENTENCE =
  "Keep every message, agreement and payment on Vallo. Vallo is not responsible for anything arranged, discussed or paid outside the platform.";

/**
 * The one amount taken from a payment, said wherever "no fees" is said.
 * Vallo's own commission is zero today, and the Guarantee contribution is not
 * Vallo's money: but it does come out of the lister's share, so "Vallo charges
 * nothing, not to be paid" was not true for a lister and every such sentence
 * now carries this one beside it.
 */
export const GUARANTEE_CONTRIBUTION_NOTE =
  "The one amount set aside from a payment is the Vallo Guarantee contribution: between 1 and 2 percent, taken from the lister's share into a separate reserve. It is never added to the price a renter or guest pays, and it is never Vallo's own money.";

/** What has to happen before payment is available. */
export const PAYMENT_GATE_SENTENCE =
  "Payment opens only after the inspection report is submitted, both of you confirm the agreement, and Vallo approves it.";

/* -------------------------------------------------------------------------- */
/* THE HISTORY SCREENS: /payments, the earnings history, the Money desk.      */
/*                                                                            */
/* A history is a record of money that has already moved, read at the moment */
/* of asking from the payment and refund records. It is never a figure Vallo  */
/* is keeping for anybody, so no sentence below may read like one: nothing is */
/* "available", nothing is "in" an account here, nothing can be taken out.    */
/* -------------------------------------------------------------------------- */

/** Under every history's total, on every side. */
export const HISTORY_NOT_A_BALANCE =
  "This is a record of payments that have already moved. Vallo never holds your money.";

/** For a lister, under their earnings total. */
export const EARNINGS_SETTLEMENT =
  "Your share of each payment settled to the bank account on your payout details through Paystack, in the same transaction the renter or guest paid. The Guarantee contribution went to its separate reserve at the same moment.";

/** The payer's total card. */
export const PAYMENTS_TOTAL_LABEL = "Paid through Vallo";
/** Beside the payer's total, when any refund has been processed. */
export const PAYMENTS_REFUNDED_LABEL = "Refunded to you";

/** The lister's total card. */
export const EARNINGS_TOTAL_LABEL = "Your share, after reversals";
export const EARNINGS_GROSS_LABEL = "Renters and guests paid";
export const EARNINGS_REVERSED_LABEL = "Reversed by refunds";

/** The payer's empty history. */
export const PAYMENTS_EMPTY_TITLE = "No payments yet";
export const PAYMENTS_EMPTY_BODY =
  "When you pay for a rental or a stay through Vallo, the payment appears here, and so does any refund that comes back to your card or bank account.";

/** A lister's empty history. */
export const EARNINGS_EMPTY_TITLE = "Nothing has been paid to you yet";
export const EARNINGS_EMPTY_BODY =
  "When a renter or guest pays for one of your listings, your share appears here. Paystack sends it straight to your bank account, and Vallo never holds it.";

/** A host's empty history: how a host is paid, in the kit's 180 characters. */
export const HOST_EARNINGS_EMPTY_BODY =
  "When a guest pays for a stay, your share appears here. Payouts arrive by Paystack split, straight to the bank account on your payout details.";

/** A read that failed. Said plainly, and never drawn as an empty list. */
export const HISTORY_UNAVAILABLE_TITLE = "Your history could not be loaded";
export const HISTORY_UNAVAILABLE_BODY =
  "We could not read your payment records just now. Nothing has changed with your money. Refresh the page to try again.";

/** The link to the page before this one. */
export const HISTORY_EARLIER = "Show earlier";
/** Under the last page, so the end of the list is a fact and not a guess. */
export const HISTORY_END = "That is everything.";

/** The Money desk's history panel. */
export const ADMIN_HISTORY_NOTE =
  "Every payment and refund on the platform, read from the transaction and refund records at the moment of asking. Vallo holds none of it: each payment was split by Paystack in the same transaction.";
export const ADMIN_HISTORY_UNAVAILABLE =
  "The platform history could not be read just now. This does not mean there were no payments.";
