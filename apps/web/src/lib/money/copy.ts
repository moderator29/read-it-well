/**
 * THE SENTENCES THAT DESCRIBE HOW MONEY MOVES ON VALLO.
 *
 * The governing sentence (D50, the founder's own, 6 October 2026):
 *
 *   Vallo uses regulated financial infrastructure partners to process and
 *   protect eligible transactions. Vallo does not hold customer funds.
 *
 * Every surface that explains money reads its words from here, so the Terms,
 * the help centre, the emails and the screens cannot drift apart. The rules
 * every sentence below keeps:
 *
 *   - Never imply Vallo holds, keeps, owns or guarantees money. Never "100
 *     percent safe". Never a payment called successful before the provider has
 *     confirmed it.
 *   - Per rail. The DIRECT rail is live: the processor splits the charge in the
 *     same transaction and nothing is held by anybody. The PROTECTED rail (a
 *     licensed partner holds the payment until the payer confirms) is not live
 *     until ADR-0003 is accepted and the merchant account is live (D50
 *     condition 3), so its sentences are written and wait in `RAIL_COPY`; a
 *     live surface reads the rail it is actually on (`lib/money/rails.ts`).
 *   - "Protected payment" with members; "escrow" only in legal and technical
 *     text. The provider never leads a button; it is named where a rule, a
 *     receipt, the Terms or a KYC step requires it.
 *   - The Vallo Guarantee is retired (D51, guarantee_bps = 0). No sentence here
 *     offers it. What replaces it is what is true on the rail in use.
 *   - The lister pays the fee (whoPays: seller). A renter or guest sees exactly
 *     the advertised price: no fee line, no footnote, no asterisk.
 *   - Rates are policy data (basis points), never typed into a sentence: a
 *     sentence that needs a figure is a function that is handed it.
 *
 * Client-safe: constants and pure functions only.
 */

/* -------------------------------------------------------------------------- */
/* THE GOVERNING SENTENCE                                                     */
/* -------------------------------------------------------------------------- */

/** The founder's sentence, verbatim. The Terms, the help centre and the footer of every money screen. */
export const GOVERNING_SENTENCE =
  "Vallo uses regulated financial infrastructure partners to process and protect eligible transactions. Vallo does not hold customer funds.";

/** The same sentence, shortened for a screen. */
export const PARTNERS_SHORT = "Payments are processed through Vallo's financial infrastructure partners.";

/** The one-line promise on the live (direct) rail. */
export const NO_CUSTODY_SENTENCE =
  "Vallo never holds your money. When you pay, the owner's or agent's share goes straight to their bank account through our payment processor, in the same transaction.";

/** Where a refund goes. */
export const REFUND_ROUTE =
  "A refund goes back to the card or bank account you paid with, through our payment processor. Banks usually show it within 5 to 10 working days.";

/** For a lister: how and when they are paid. */
export const PAYOUT_ANSWER =
  "Your share of a payment settles straight to the bank account on your payout details, through Paystack, at the moment the renter or guest pays. Vallo never holds it, so there is nothing to withdraw. Paystack pays settled money into your bank on its normal settlement schedule.";

/** The supply page's last step for a host (/for-hosts): how a stay is paid out, with no screen to point at. */
export const HOST_PAYOUT_STEP =
  "When a guest pays for a stay, your share goes by Paystack split straight to the bank account on your payout details.";

/* -------------------------------------------------------------------------- */
/* WHAT STANDS BEHIND A PAYMENT, PER RAIL (what replaced the Guarantee)       */
/* -------------------------------------------------------------------------- */

/** The two rails, in Vallo's own words. Never a provider's name. */
export type MoneyRail = "direct" | "protected";

/**
 * What stands behind a payment on the DIRECT rail, which is live. Said where
 * the Guarantee sentence used to be: the gate that opened the payment, the
 * terms fixed on the booking, and where a refund goes. Nothing is held.
 */
export const DIRECT_RAIL_STANDING =
  "What stands behind this payment: payment opened only after the agreement was confirmed and approved, the cancellation terms are fixed on your booking, and a refund due to you goes back to the card or account you paid with.";

/**
 * What stands behind a payment on the PROTECTED rail (not live). The
 * replacement trust story D51 names, with who holds the money said plainly.
 */
export const HELD_UNTIL_YOU_CONFIRM =
  "Your payment is held by Vallo's licensed payment partner until you confirm. It is released to the owner or agent only when you confirm, or when the agreed release condition is met. Vallo does not hold it.";

/** The protected rail's line for a screen, per D50. */
export const PROTECTED_SHORT = "Your payment is protected through Vallo's transaction infrastructure.";

export type RailCopy = {
  /** What a member is told stands behind the payment. */
  standing: string;
  /** How the money moves, in one sentence. */
  howItMoves: string;
  /** When the owner or agent receives it. */
  releaseCondition: string;
  /** Where a refund goes. */
  refund: string;
};

/** The words for each rail. A live surface picks the rail it is on, never the one it wishes it were. */
export const RAIL_COPY: Record<MoneyRail, RailCopy> = {
  direct: {
    standing: DIRECT_RAIL_STANDING,
    howItMoves: NO_CUSTODY_SENTENCE,
    releaseCondition: "Paid to the owner or agent at the moment you pay, through our payment processor.",
    refund: REFUND_ROUTE,
  },
  protected: {
    standing: HELD_UNTIL_YOU_CONFIRM,
    howItMoves: `${PROTECTED_SHORT} ${GOVERNING_SENTENCE}`,
    releaseCondition: "Released to the owner or agent when you confirm, or when the agreed release condition is met.",
    refund:
      "If the payment does not go ahead, it goes back to you from the partner holding it, once the cancellation is agreed or decided.",
  },
};

/* -------------------------------------------------------------------------- */
/* INSPECTION, THE OFF-PLATFORM RULE, THE GATE                                */
/* -------------------------------------------------------------------------- */

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

/* The space detail's sentences about paying (/listing/[id]'s description),
   moved out of the page (Round 3 sweep, C3). The words are the page's own. */
/** A sale: inspect, then have the title checked before money moves. */
export const LISTING_SALE_ABOUT =
  "This property is for sale. Message the agent to ask questions and arrange an inspection, and have your own solicitor verify the title before any money changes hands.";
/** A rental: inspect before paying. */
export const LISTING_RENTAL_ABOUT =
  "This home is let on an annual tenancy. Message the agent to ask questions and arrange an inspection, then pay only after you have inspected the property.";
/** How a rent figure is quoted. */
export const LISTING_RENT_QUOTED = "The rent is quoted for a full year and agreed directly with the agent.";
/** A stay: reserve, inspect, then pay. */
export const LISTING_STAY_PAY_AFTER =
  "Reserve online, then arrange an inspection with the agent from your Inbox. Pay only after you have inspected the property.";

/** What has to happen before payment is available. */
export const PAYMENT_GATE_SENTENCE =
  "Payment opens only after the inspection report is submitted, both of you confirm the agreement, and Vallo approves it.";

/* The agreement page's money lines (/agreements/[id]), moved out of the page
   (Round 3 sweep, C3). The words are the page's own, unchanged. */
/** The renter's one action once the agreement is approved. `amount` is formatted. */
export function agreementPayLabel(amount: string): string {
  return `Pay ${amount}`;
}
/** Both parties confirmed and Vallo is reviewing. */
export const AGREEMENT_IN_REVIEW =
  "Both of you confirmed. A person at Vallo is reviewing the agreement. You will get an email and a notification the moment it is decided. Payment opens only after approval.";
/** The section an approved agreement opens. */
export const AGREEMENT_PAYMENT_OPEN_TITLE = "Payment is open";
/** The lister's line once the agreement is approved. */
export function agreementOwnerApproved(kind: "rent" | "stay"): string {
  return `Vallo approved the agreement. The ${kind === "rent" ? "renter" : "guest"} can pay now, and your share settles straight to your bank account from the same payment.`;
}

/* -------------------------------------------------------------------------- */
/* WHO PAYS THE FEE (D51: the lister; the renter sees exactly the price)      */
/* -------------------------------------------------------------------------- */

/**
 * The whole fee story in one sentence, for the help centre, the supply pages
 * and the assistant. Rate-free, so it is true whatever the policy row says.
 * NOT for a renter's checkout or a listing's price: there the price is the
 * price, and nothing is said about fees at all.
 */
export const WHO_PAYS_SENTENCE =
  "Renters and guests pay exactly the price on the listing, with nothing added. Listing is free; when a payment is made, Vallo's platform fee comes out of the lister's share and is shown to the lister in naira.";

/**
 * Vallo's charges, said to anybody: the renter side first, because that is
 * the promise. Replaces the line that called the commission zero and offered
 * the Guarantee contribution (lib/trust/standards.ts reads this).
 */
export const NO_RENTER_FEES_LINE =
  "Vallo charges renters and guests nothing: no fee to look, to book or to pay, and nothing added to the price on the listing. Listing is free. When a payment is made, Vallo's platform fee comes out of the lister's share.";

/**
 * Retired with the Guarantee (D51), kept ONLY because the published Terms and
 * Disclaimer still carry their Guarantee sections and must not change without
 * counsel and a new Terms version. No other surface may read this. The patch
 * that retires it is in the C2 report (terms-guarantee.patch).
 */
export const GUARANTEE_SCOPE =
  "At launch the Guarantee covers rentals and stays paid through Vallo. It does not cover property purchases.";

/**
 * A payment made BEFORE the Guarantee was retired carried a contribution, and
 * its claim window is honoured: shown only on an agreement whose frozen terms
 * carry a non-zero `guarantee_bps`. Never on a new payment.
 */
export const LEGACY_GUARANTEE_CLAIM =
  "This payment was made while the Vallo Guarantee was running, and a contribution was set aside from the lister's share. You can still claim on it inside the window below. A person at Vallo reviews every claim before anything is paid.";

/**
 * The lister's line on an agreement paid while the Guarantee ran: what was set
 * aside from their share. `percentText` is the frozen `guarantee_bps` as a
 * percentage ("1.5"). Drawn only when that frozen rate is above zero, never on
 * a new payment (D51). Moved from the agreement page word for word (A9).
 */
export function legacyReserveSentence(percentText: string): string {
  return `Under the terms you agreed, ${percentText}% of the total was set aside from your share for the Vallo Guarantee reserve.`;
}

/* -------------------------------------------------------------------------- */
/* THE LISTER'S FEE, BEFORE PUBLISHING (D51, the agreement gate)              */
/* -------------------------------------------------------------------------- */

/** What the lister's figure is called, by what they are listing. */
export type ListerFigureKind = "rent" | "stay" | "sale";

export const LISTER_FIGURE_LABEL: Record<ListerFigureKind, string> = {
  rent: "Rent you set",
  stay: "Nightly price you set",
  sale: "Price you set",
};

/**
 * THE WORDING'S VERSION, recorded with every acceptance (D61: the record
 * stores the terms version). Change any sentence in this block that the
 * lister reads on the fee screen and this changes with it, so a record can
 * always say which words were accepted.
 */
export const LISTER_FEE_TERMS_VERSION = "lister-fee-2026-10-06";

/**
 * D61. The rail is not knowable when the lister accepts, so the fee is a
 * range anchored on the worst case, and the second two percent is named for
 * what it buys. "Escrow" is used here, against the member-copy habit of
 * "protected payment", because this screen forms part of an agreement and
 * D61 sets these words. No sentence here says "you keep N percent" or
 * compares Vallo with what anybody else charges.
 */
export const PLATFORM_FEE_LABEL = "Platform fee";

/** "Vallo, 2%". The percentage is the policy's, handed in as text. */
export function valloFeeLabel(percentText: string, capped: boolean): string {
  return capped ? `Vallo, ${percentText}%, capped` : `Vallo, ${percentText}%`;
}

/** "Escrow protection, 2%": the escrow partner's fee, never called Vallo's. */
export function escrowProtectionLabel(percentText: string): string {
  return `Escrow protection, ${percentText}%`;
}
export const ESCROW_PROTECTION_WHEN = "when a buyer pays into escrow";

/** The payment processor's fee, which the lister bears on a direct payment. */
export const PROCESSOR_FEE_LABEL = "Payment processor's fee";
export const PROCESSOR_FEE_WHEN = "when a buyer pays directly";
export function upToText(amountText: string): string {
  return `up to ${amountText}`;
}

/** "36,000 to 72,000", or the one figure when both ends are the same. */
export function feeRangeText(lowText: string, highText: string): string {
  return lowText === highText ? lowText : `${lowText} to ${highText}`;
}
/** The top of "You receive", set small beside the headline figure. */
export function rangeUpperText(highText: string): string {
  return `to ${highText}`;
}

export const LISTER_RECEIVE_LABEL = "You receive";

export const FEE_GATE_TITLE = "What you receive";

/** Under the range: which figure to count on. The lower one, always. */
export function receiveRangeNote(escrowIsLowest: boolean): string {
  return escrowIsLowest
    ? "Count on the lower figure: it is what you receive when a buyer pays into escrow. When a buyer pays directly, you receive more."
    : "Count on the lower figure: it is the least you receive, however the buyer pays.";
}

/** Under the arithmetic: what the renter sees. The renter's side, said to the lister. */
export function renterSeesSentence(priceText: string): string {
  return `Renters and guests see ${priceText}, exactly. Nothing is added to it.`;
}

/**
 * D60: the screen while the blocking flag is off. There is no checkbox, and
 * this says why: nothing is recorded, and sending does not wait.
 */
export const FEE_PREVIEW_NOTE =
  "Nothing is recorded yet. Accepting these figures is not open, and sending your listing for review does not wait for it.";

export const FEE_ACCEPT_LABEL = "I accept these figures for this listing";
export const FEE_ACCEPT_ACTION = "Accept and continue";
export const FEE_ACCEPTED = "Accepted";

/** What accepting records, and the promise about a rate change. */
export const FEE_ACCEPT_RECORD =
  "Vallo records your acceptance with the date, both rates and these figures. If a rate changes, we ask you again, and you keep the rates you accepted until you accept new ones.";

/** The policy could not be read: the gate says so and does not guess a rate. */
export const FEE_UNREADABLE_TITLE = "We cannot show your fee figures just now";
export const FEE_UNREADABLE_BODY =
  "Publishing waits until we can show you, in naira, exactly what you receive. Nothing about your listing has changed. Try again in a moment.";
/** The same, while the blocking flag is off (D60): nothing waits on it. */
export const FEE_UNREADABLE_BODY_OPEN =
  "Nothing about your listing has changed, nothing is recorded, and sending it for review does not wait for these figures.";

/** The acceptance could not be recorded: nothing was sent for review. */
export const FEE_ACCEPT_UNRECORDED =
  "Your acceptance could not be recorded just now, so the listing has not been sent. Nothing has changed. Try again in a moment.";

/** The rate version moved between reading and accepting. */
export const FEE_RATE_MOVED =
  "The rate changed while you were reading. Check the new figures and accept them again.";

/** The lister has not typed a figure yet. */
export const FEE_NEEDS_FIGURE = "Set your price above and the figures appear here.";

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
  "Your share of each payment settled to the bank account on your payout details through Paystack, in the same transaction the renter or guest paid.";

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

/* -------------------------------------------------------------------------- */
/* THE CHECKOUT THAT UNDERSTANDS THE TRANSACTION (D50 section 3)              */
/* -------------------------------------------------------------------------- */

export const CHECKOUT_TX_TITLE = "What this payment is";

export const CHECKOUT_TX_LABEL = {
  space: "For",
  agreement: "Agreement",
  payer: "Paid by",
  payee: "Paid to",
  amount: "Amount",
  standing: "What stands behind it",
  conditions: "Conditions",
  release: "When the owner or agent receives it",
  references: "References",
} as const;

export const CHECKOUT_PAYER_YOU = "You";
/** The payee's name could not be read: said as the role, never invented. */
export const CHECKOUT_PAYEE_ROLE = "The owner or agent on the agreement";
/** The agreement does not exist yet (a request the host has not accepted). */
export const CHECKOUT_NO_AGREEMENT = "No agreement yet. Payment opens once there is one and Vallo has approved it.";
/** The amount, said as the advertised price and nothing else (D51). */
export const CHECKOUT_AMOUNT_NOTE = "The price on the listing, in full.";

/* -------------------------------------------------------------------------- */
/* THE REFERENCE SYSTEM                                                       */
/* -------------------------------------------------------------------------- */

export const REFERENCES_NOTE =
  "Each reference names a different record. Quote the transaction reference to Vallo, and the partner reference to your bank.";

/** The checkout's conditions, said only when each is true of this booking. */
export const CHECKOUT_CONDITION_APPROVED = "Vallo approved the agreement before payment opened.";
export const CHECKOUT_CONDITION_CANCEL = "The cancellation terms below are fixed on this booking.";

/* -------------------------------------------------------------------------- */
/* THE REWARDS BALANCE (D51). Requested by Session 3 C3 for the referral      */
/* dashboard (`app/(app)/rewards`, `components/app/referral`).                */
/*                                                                            */
/* A Rewards Balance is Vallo owing a member money for referrals that         */
/* qualified: a debt, not custody, paid from Vallo's marketing float through  */
/* Paystack transfers. It is never called a wallet. No rate is written here:  */
/* `{reward}`, `{cap}` and `{minimum}` are filled from `money_policy`.         */
/* -------------------------------------------------------------------------- */

/** Under the Rewards Balance figures. */
export const REWARDS_NOT_HELD =
  "Your Rewards Balance is what Vallo owes you for referrals that qualified. It is not money held for you, and it does not expire.";

/** How a referral earns. `{reward}` is formatted money, `{cap}` a number. Must match Session 2's qualification rule. */
export const REWARDS_QUALIFY =
  "Each referral that qualifies adds {reward} to your Rewards Balance, for up to {cap} qualified referrals a month. Signing up alone does not qualify: the person must confirm their phone number and use Vallo for real.";

/** Stated before anybody starts earning. `{minimum}` is formatted money. */
export const REWARDS_WITHDRAW_MINIMUM = "You can withdraw once your available balance reaches {minimum}.";

/** On the withdraw screen, before anything is prepared. */
export const REWARDS_FEE_SHOWN_FIRST =
  "The processing fee is set by our payout partner when your withdrawal is prepared. You see it, and what you will receive, before you confirm.";

/** Where a reward withdrawal is paid from. */
export const REWARDS_PAID_FROM =
  "Rewards are paid from Vallo's own funds to the bank account you choose, through Paystack.";

/** The scheme question, answered plainly. */
export const REWARDS_NOT_INVESTMENT =
  "Rewards are not an investment. There is nothing to pay in, and only the people you invite yourself are counted.";

/**
 * D64. Under "Rewards are paused this month", on every rewards surface and the
 * invite hub. A pause stops new referrals qualifying; it never reaches
 * backwards, so what is already earned is still the member's and still paid.
 * "As usual" keeps the review window and the withdrawal rules in force.
 */
export const REWARDS_PAUSED_EARNED =
  "The pause does not touch anything you have already earned. Every reward from a referral that qualified is still yours and will be paid as usual.";

/* -------------------------------------------------------------------------- */
/* THE TRANSACTION TIMELINE, IN SENTENCES (never a status name on screen)     */
/* -------------------------------------------------------------------------- */

/**
 * One sentence per thing that happened, from each side. `{amount}` is the
 * figure formatted once by the caller. A partner is "our payment partner" in
 * the product's voice and is named on a receipt, never in a timeline row.
 */
export const TIMELINE_SENTENCE: Record<
  | "agreement_approved"
  | "payment_started"
  | "payment_confirmed"
  | "protected"
  | "release_requested"
  | "released"
  | "settled_to_payee"
  | "refund_requested"
  | "refund_sent"
  | "refund_arrived"
  | "review_opened"
  | "review_closed"
  | "payment_failed"
  | "cancelled",
  { payer: string; payee: string }
> = {
  agreement_approved: {
    payer: "Vallo approved the agreement, and payment opened.",
    payee: "Vallo approved the agreement, and payment opened for the renter or guest.",
  },
  payment_started: {
    payer: "You started a payment of {amount}.",
    payee: "The renter or guest started a payment of {amount}.",
  },
  payment_confirmed: {
    payer: "Our payment partner confirmed your payment of {amount}.",
    payee: "Our payment partner confirmed a payment of {amount} to you.",
  },
  protected: {
    payer: "Your payment of {amount} is held by our licensed payment partner until you confirm.",
    payee: "The payment of {amount} is held by our licensed payment partner until the renter or guest confirms.",
  },
  release_requested: {
    payer: "You confirmed, so the payment is being released to the owner or agent.",
    payee: "The renter or guest confirmed, so the payment is being released to you.",
  },
  released: {
    payer: "The payment was released to the owner or agent.",
    payee: "The payment was released to you.",
  },
  settled_to_payee: {
    payer: "The owner's or agent's share was paid to their bank account.",
    payee: "Your share of {amount} was paid to your bank account.",
  },
  refund_requested: {
    payer: "You asked for a refund of {amount}.",
    payee: "A refund of {amount} was asked for.",
  },
  refund_sent: {
    payer: "Your refund of {amount} was sent to the card or account you paid with.",
    payee: "A refund of {amount} was sent to the person who paid.",
  },
  refund_arrived: {
    payer: "Our payment partner completed your refund of {amount}. Your bank may take a few days to show it.",
    payee: "The refund of {amount} was completed.",
  },
  review_opened: {
    payer: "A person at Vallo is looking at this payment.",
    payee: "A person at Vallo is looking at this payment.",
  },
  review_closed: {
    payer: "The review is closed, and its outcome is on the agreement.",
    payee: "The review is closed, and its outcome is on the agreement.",
  },
  payment_failed: {
    payer: "The payment did not go through.",
    payee: "The renter's or guest's payment did not go through.",
  },
  cancelled: {
    payer: "The payment was cancelled.",
    payee: "The payment was cancelled.",
  },
};

export const TIMELINE_TITLE = "What has happened";
export const TIMELINE_NEXT = "Next";
export const TIMELINE_EMPTY = "Nothing has happened to this payment yet.";

/* -------------------------------------------------------------------------- */
/* THE MONEY CENTRE: AVAILABLE AND PROTECTED (protected rail; not live)        */
/*                                                                            */
/* Both figures are the member's own account at the licensed partner, read   */
/* from the partner. Vallo holds neither, and every sentence says who does.   */
/* -------------------------------------------------------------------------- */

export const MONEY_CENTRE_TITLE = "Your money";
export const AVAILABLE_LABEL = "Available";
export const AVAILABLE_WORD = "Yours to withdraw to your bank.";
export const PROTECTED_LABEL = "Protected";
export const PROTECTED_WORD =
  "Held in protected payments until each one's release condition is met. Not yours to withdraw yet.";

/** Who holds both figures, named, with the governing sentence. */
export function heldBySentence(heldBy: string): string {
  return `Both figures are held in your own account at ${heldBy}, a licensed payment partner. ${GOVERNING_SENTENCE}`;
}

/** When the partner said so. A balance without a time is never shown. */
export function balanceAsOf(heldBy: string, when: string): string {
  return `As ${heldBy} reported it, ${when}.`;
}

/** The honest state while the protected rail is not live, or the read is absent. */
export const MONEY_CENTRE_ABSENT_TITLE = "There is no balance to show";
export const MONEY_CENTRE_ABSENT_BODY =
  "Payments on Vallo go straight to the owner's or agent's bank account in the same transaction, so nothing waits in an account for you. Your payments and refunds are below.";

/* -------------------------------------------------------------------------- */
/* WITHDRAWAL: THE MATHS BEFORE THE CONFIRM (D51)                              */
/*                                                                            */
/* The fee is READ BACK from the partner's payment intent, never computed     */
/* from a table, and the screen waits for it. No estimate is ever dressed as  */
/* a total.                                                                   */
/* -------------------------------------------------------------------------- */

export const WITHDRAW_TITLE = "Withdraw to your bank";
export const WITHDRAW_AMOUNT = "Amount";
export const WITHDRAW_FEE = "Processing fee";
export const WITHDRAW_RECEIVE = "You'll receive";
export const WITHDRAW_WAITING_FEE = "Being set by our payment partner";
export const WITHDRAW_WAITING_BODY =
  "Our payment partner sets the fee on this withdrawal when it is prepared. The total appears here once they have, and you confirm only after you have seen it.";
export const WITHDRAW_FEE_NOTE =
  "This fee was set by our payment partner on this withdrawal and read back from it. It is not an estimate.";
export const WITHDRAW_EXPIRED =
  "This withdrawal was not confirmed in time, so its fee no longer holds. Prepare it again to see the current fee.";
export const WITHDRAW_FAILED =
  "We could not prepare this withdrawal, so no fee was set and nothing has moved. Try again in a moment.";
export const WITHDRAW_CONFIRM = "Confirm withdrawal";

export function withdrawDestination(accountName: string, bankName: string, last4: string): string {
  return `To ${accountName}, ${bankName}, account ending ${last4}.`;
}

/** The minimum, from policy (D51: 1,000 naira today), handed in already formatted. */
export function withdrawMinimum(minimumText: string): string {
  return `The smallest withdrawal is ${minimumText}.`;
}

/* -------------------------------------------------------------------------- */
/* THE RECEIPT VAULT, MEMBER REFUNDS, PAYOUTS (R3-05)                          */
/* -------------------------------------------------------------------------- */

export const RECEIPTS_TITLE = "Receipts";
export const RECEIPTS_LEDE =
  "Every payment you made through Vallo and every refund that came back, each with its receipt. Open one to print or save it.";
export const RECEIPTS_SEARCH_LABEL = "Search your receipts";
export const RECEIPTS_SEARCH_HINT = "A place, or a reference";
export const RECEIPTS_FILTER = { all: "All", payment: "Payments", refund: "Refunds" } as const;
export const RECEIPTS_EMPTY_TITLE = "No receipts yet";
export const RECEIPTS_EMPTY_BODY =
  "A receipt is issued when a payment through Vallo is confirmed by our payment partner, and when a refund comes back to you.";
export const RECEIPTS_NO_MATCH = "No receipt matches that search.";
/** Honest about scope: the search runs over the receipts this page read. */
export function receiptsSearchScope(count: number): string {
  /* No English plural branch (the no-english-plurals rule): the count is a
     figure beside a fixed noun phrase, true at any number. */
  return `Searching the records on this page (${count}). Show earlier to search further back.`;
}
export const RECEIPT_OPEN = "Open receipt";
export const RECEIPT_PRIVACY_TITLE = "Sharing a receipt";
export const RECEIPT_PRIVACY_BODY =
  "A rent receipt can be shared with a code instead of the document. Whoever checks the code sees the amount, the month, first names and the area, and never the address, a phone number or an email.";
export const RECEIPT_PRIVACY_ACTION = "Check a receipt code";
/**
 * The complaint pack's receipt-code line while the move-in is not paid in
 * full (a flatmate's share settled, the rest not). `create_receipt_code`
 * answers `not_paid` until `private.tenancy_paid`, and the tenancy file draws
 * the code panel only on a paid file, so "make a receipt code" was untrue.
 */
export const RECEIPT_CODE_AFTER_FULL_PAYMENT =
  "A receipt code can be made in the tenancy file once the move-in is paid in full.";
/**
 * The same line once the charge is void (cancelled, refunded or reversed):
 * `create_receipt_code` answers `not_paid` and `verify_receipt` answers
 * `not_found` for a void tenancy, so no code can be made or checked.
 */
export const RECEIPT_CODE_VOID =
  "A receipt code cannot be made or checked for a move-in that was cancelled, refunded or reversed.";
/** The complaint pack's money section on a void charge: the state said, under the total. */
export const TENANCY_VOID_STATEMENT = "This move-in was cancelled, refunded or reversed, so nothing is owed on it.";

export const REFUNDS_TITLE = "Refunds";
export const REFUNDS_LEDE =
  "Every refund on a payment you made, and where each one is. A refund goes back the way the money came.";
export const REFUNDS_EMPTY_TITLE = "No refunds";
export const REFUNDS_EMPTY_BODY =
  "If a stay is cancelled or a payment has to come back to you, the refund appears here with where it stands.";
export const REFUNDS_HOW_TITLE = "Asking for a refund";
export const REFUNDS_HOW_BODY =
  "Ask from the booking itself, so the request is dated and tied to the payment. The booking shows the cancellation terms that apply.";
export const REFUNDS_SCOPE = "Refunds among the payments and refunds on this page.";

export const PAYOUTS_TITLE = "Payouts";
export const PAYOUTS_LEDE =
  "What renters and guests paid for your spaces, the platform fee, and what reached your bank, payment by payment.";
export const PAYOUT_PAID_LABEL = "Renter or guest paid";
export const PAYOUT_FEE_LABEL = "Platform fee";
export const PAYOUT_RECEIVED_LABEL = "You received";
export const PAYOUT_REVERSED_LABEL = "Reversed by a refund";
/** A row whose fee parts the record does not carry: said, never computed. */
export const PAYOUT_FEE_UNRECORDED = "Not on this record";
export const PAYOUTS_EMPTY_TITLE = "No payouts yet";
export const PAYOUTS_SAME_FIGURES =
  "Each payout shows the same three figures a lister sees before publishing: what was paid, the platform fee, and what you received.";
/** The processor's own fee on a direct-rail payout, borne by the lister and named. */
export const PAYOUT_PROCESSING_LABEL = "Payment processing, by Paystack";

/* -------------------------------------------------------------------------- */
/* /payments, THE PAYER'S OWN MONEY SCREEN (R3-04)                             */
/* -------------------------------------------------------------------------- */

export const PAYMENTS_DOORS_LABEL = "Your records";
export const PAYMENTS_DOOR = {
  receipts: { title: "Receipts", sub: "Search, open, print or save every receipt" },
  refunds: { title: "Refunds", sub: "Every refund and where it stands" },
  methods: { title: "Payment methods", sub: "Saved cards and bank accounts" },
  agreements: { title: "Agreements", sub: "What each payment rests on" },
} as const;

/* -------------------------------------------------------------------------- */
/* /settings/payments (R3-04)                                                  */
/* -------------------------------------------------------------------------- */

export const SETTINGS_PAY_RECORDS = "Records";
export const SETTINGS_PAY_PAID_TITLE = "How you are paid";
export const SETTINGS_PAY_DOOR = {
  receipts: { title: "Receipts", sub: "Every payment and refund, with its receipt" },
  refunds: { title: "Refunds", sub: "Where each refund stands" },
  payouts: { title: "Payouts", sub: "What you received, with the platform fee in naira" },
} as const;

/* -------------------------------------------------------------------------- */
/* /host/bookings: a hotel answering a room request (C5, the route sweep)      */
/* -------------------------------------------------------------------------- */

/** Under the room bookings heading, after how accepting works. */
export const HOST_ROOM_BOOKING_PAYMENT =
  "Once it is approved on Vallo, the guest pays by card and your share goes straight to your default bank account.";
/** The total on the accept sheet: what the guest is asked for, not what the host receives. */
export const HOST_ROOM_TOTAL_LABEL = "Total the guest pays";
/** The last step after accepting. */
export const HOST_ROOM_GUEST_PAYS_NEXT = "The guest pays by card once it is approved.";

/* -------------------------------------------------------------------------- */
/* /host/earnings and /host/earnings/statement (C5, the route sweep)           */
/* -------------------------------------------------------------------------- */

/** A host's earnings before anybody has paid. */
export const HOST_EARNINGS_EMPTY_TITLE = "No guest has paid yet";
/** Under each month in the list of statements. */
export const HOST_STATEMENT_ROW_SUB = "Every payment, line by line, with a CSV";
/** The statement's door for somebody signed out. It said "what Vallo kept", which reads as Vallo keeping money. */
export const HOST_STATEMENT_SIGNED_OUT_BODY =
  "Sign in to see every payment, the platform fee on it, and what reached your bank.";
/** A month with no payment in it. Same correction: the fee is named, nothing is "kept". */
export const HOST_STATEMENT_EMPTY_TITLE = "No payments this month";
export const HOST_STATEMENT_EMPTY_BODY =
  "When a guest pays, the payment appears here line by line: what they paid, the platform fee, and your share.";

/* -------------------------------------------------------------------------- */
/* /cancellations and /safety (C6, the route sweep): the money sentences the  */
/* two pages wrote for themselves, moved here word for word. One changed:     */
/* /safety's "Vallo keeps no balance for you, so there is nothing to          */
/* withdraw" is untrue beside the Rewards Balance (D51, a debt Vallo owes and */
/* pays out), so both pages now say the narrower true thing about a refund;  */
/* and the payment reference opens from Plans, the name the app gives what   */
/* this sentence called Bookings.                                             */
/* -------------------------------------------------------------------------- */

/** A refund, after REFUND_ROUTE: nothing on Vallo holds it on the way back. Both pages. */
export const REFUND_NO_BALANCE =
  "There is no Vallo balance for a refund to sit in, so it always goes back the way the money came.";

/*
 * WHAT NO BALANCE HOLDS (A9, 6 October). /docs, the FAQ and both assistant
 * prompts said "Vallo keeps no balance in your name ... nothing to top up and
 * nothing to withdraw" and "There is no Vallo wallet, balance or escrow".
 * Beside the Rewards Balance (D51, a debt Vallo owes and pays out) the broad
 * version is untrue. This is the narrower thing that is: no balance holds a
 * payment. The Rewards Balance is named as separate, and never a wallet.
 */

/** /docs chapter 6 and the FAQ: no Vallo balance holds a payment. */
export const NO_PAYMENT_BALANCE =
  "No Vallo balance holds your rent or any other payment, so there is nothing to top up before you pay, and no payment of yours waits with Vallo to be withdrawn.";

/** After NO_PAYMENT_BALANCE, wherever somebody may be asking about rewards. */
export const REWARDS_BALANCE_SEPARATE =
  "Referral rewards are separate: where they run, they are counted as a Rewards Balance, which is what Vallo owes you and never money held for you.";

/** /docs chapter 6: who it is when somebody claims Vallo is holding money. */
export const HELD_MONEY_NOT_US =
  "If anybody tells you that Vallo is holding money for you, or asks you to send money to be held, it is not us.";

/** /cancellations, the lede: the terms are fixed when the stay is paid. */
export const CANCEL_LEDE =
  "A stay listed by an owner or agent follows the three steps below; a hotel room shows its own rate's terms before you choose it. Either way the terms are fixed on your booking when you pay, so they cannot change afterwards.";

/** /cancellations: a hold nobody has paid for. */
export const CANCEL_BEFORE_PAID =
  "A reservation you have not paid for is a hold on the calendar and nothing more. Cancel it from Plans, at any hour, for nothing, and the nights reopen for somebody else immediately. A hold you walk away from releases itself, so you cannot accidentally block an agent's calendar by forgetting about it.";

/** /cancellations: a paid stay is cancelled by a person, and where the refund goes. */
export const CANCEL_AFTER_PAID =
  "Once money has moved, a cancellation is handled by a person rather than by a button, because a refund is somebody's money and it deserves a name against the decision. Write to support with your booking reference. We apply the schedule above exactly as it is written, the refund goes back to the card or account you paid with, and you get the amount and the reason in writing.";

/** /cancellations: the agent cancels. `{hours}` is FULL_REFUND_HOURS, set as a figure by the page. */
export const CANCEL_BY_AGENT =
  "You get everything back, whenever it happens, including inside the last {hours} hours. The schedule above never applies to a cancellation you did not choose.";

/** /cancellations: the place is not what was listed. */
export const CANCEL_NOT_AS_LISTED =
  "Do not cancel. Report it from the listing on the day, with photographs if you have them. A misrepresented property is a standards matter, not a cancellation, and it is refunded in full once a person has looked at it.";

/** /cancellations: the guest could not get in. */
export const CANCEL_NO_ENTRY =
  "A gate that will not open, an estate that has no record of you, a key nobody brings. Message the agent in the thread so there is a time stamp, then report it. Same treatment: full refund once it is confirmed.";

/** /cancellations: a restaurant table. */
export const CANCEL_TABLE =
  "Nothing is taken for a table, so nothing has to come back. You ask a restaurant for a date, a time and a party size, and the restaurant confirms it or turns it down. Cancel from the reservation at any hour, for nothing, and tell them in its own conversation if you are simply running late. You pay the restaurant when you eat, and the schedule above has nothing to say about any of it.";

/** /safety, under the one rule: why nobody should send an account number. */
export const SAFETY_NO_ACCOUNT_NUMBER =
  "We add nothing to the price you are shown, and every payment happens inside the platform. So there is no honest reason for anyone to send you an account number, and if somebody does, they are not doing platform business. Report them and stop replying.";

/** /safety, how paying works: after NO_CUSTODY_SENTENCE, the processor and both sides. */
export const SAFETY_PAY_THROUGH_VALLO =
  "Every payment on Vallo goes through the checkout screen with a licensed Nigerian payment processor, using a card or a bank transfer raised by the processor. That is true on both sides: a hotel room for Friday and a flat for the year are paid the same way, and there is no step on either where somebody sends you an account number.";

/** /safety, how paying works: the price is whole, and whose fees are whose. */
export const SAFETY_PRICE_IS_WHOLE =
  "The total you see before you commit is the lister's own number for that market, whole: the move-in total on a yearly tenancy, the nights and any cleaning charge on a shortlet, the asking price on a sale or a lease. Where an agent charges a fee of their own it is theirs, it belongs on the listing and not at the door, and it is named as theirs. Nothing of ours is added at the end. If your bank or card network takes something of their own, that is theirs and it is named as theirs too.";

/** /safety, how paying works: the reference every payment leaves. */
export const SAFETY_PAYMENT_RECORD =
  "Every payment writes a reference against your booking that you can open from Plans and from Agreements. If anything goes wrong, that reference is what a person on our side works from. A transfer you made to somebody's personal account has no such record and cannot be traced by us.";

/** /safety, how paying works: a table is not a payment. */
export const SAFETY_TABLE_NOT_A_PAYMENT =
  "A restaurant reservation is a request, not a payment. You ask for a date, a time and a party size, the restaurant answers, and you pay the restaurant when you eat. Nobody on Vallo has any reason to take money from you for a table, and anybody asking for one is not doing platform business.";

/** /safety, already paid outside: what Vallo can and cannot do. */
export const SAFETY_OUTSIDE_NOT_RECOVERABLE =
  "We cannot recover money that never came through the platform, and we will not pretend otherwise, but we can remove the account, hold the listing, and stop the same person from doing it to the next person.";

/* -------------------------------------------------------------------------- */
/* THE LOCK ON MONEY (V-81)                                                   */
/* -------------------------------------------------------------------------- */
/*
 * What the phone's lock guards, said as it is: Vallo holds no money, so there
 * is no wallet to send from and nothing to withdraw (`lib/security/money-intent.ts`).
 * The lock stands in front of the accounts a person's money is paid into: a
 * bank account or payout account added, made the default or removed, and the
 * lock itself removed. The dictionary's "Sending and withdrawing" lines said
 * otherwise and are no longer read on this screen.
 */

/** /settings/privacy/money-lock, the lede: what the lock is for. */
export const MONEY_LOCK_WHAT =
  "Use this phone's face or fingerprint lock before anybody adds, changes or removes the account your money is paid into, so a stolen unlocked phone cannot redirect it.";

/** /settings/privacy, the row's line under "Lock money with this phone". */
export const MONEY_LOCK_ROW =
  "Face or fingerprint before your payout account changes";

/** The money-lock group's note while nothing has happened. */
export const MONEY_LOCK_BODY =
  "Adding, changing or removing the bank or payout account your money is paid into will ask for this phone's face or fingerprint lock. If the lock will not answer, your password still works.";

/** After a phone is added as the lock. */
export const MONEY_LOCK_DONE = "Done. Changing where your money is paid will now ask for this phone's lock.";

/** After a phone is removed as the lock. */
export const MONEY_LOCK_REMOVED = "Removed. This phone no longer guards where your money is paid.";

/* -------------------------------------------------------------------------- */
/* PAID PROMOTION (D3, D60, docs/promotion/VALLO_PROMOTION.md)                */
/* -------------------------------------------------------------------------- */
/*
 * Promotion is Vallo's own revenue: a single-party charge settled to Vallo's
 * payment account and posted to `ledger_vallo_revenue` (D51). No split, no
 * subaccount, nothing held for anybody. It cannot be sold until the company
 * payment account exists (D38), so the onboarding's fourth screen says buying
 * is not open and draws no pay button. These are its sentences
 * (`components/app/feature-onboarding/first-runs.ts`, `promotionFirstRun`).
 */

/** Promotion's fourth onboarding screen, the body: buying is not open yet. */
export const PROMOTION_NOT_ON_SALE =
  "Buying opens when payments for promotion are live. Nothing can be paid for here yet.";

/** Over the four tiers: the prices are proposals (D38 pattern), confirmed before buying opens. */
export const PROMOTION_PRICES_PROPOSED = "Proposed prices, to be confirmed before buying opens.";

/** When a promotion starts. Never before the processor confirms the payment. */
export const PROMOTION_STARTS = "When our payment processor confirms your payment, and never before.";

/** When it ends. */
export const PROMOTION_ENDS = "By itself, when its days are up, on the end date shown before you pay.";

/** Statement 5: front door and map slots cannot be oversold. */
export const PROMOTION_FULL_DAYS =
  "Featured and Everywhere have a fixed number of slots per city per day, shown before you pay. When a day is full the sale is refused, with the reason and the next date that is free.";

/** Statement 7 and the refund route. */
export const PROMOTION_REFUNDED =
  "It stops appearing as the refund is recorded, and the refund goes back to the card or bank account you paid with, through our payment processor.";
