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
