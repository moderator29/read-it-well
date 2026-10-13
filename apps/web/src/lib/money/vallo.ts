import type { MoneyRail } from "./copy";
import type { MoneyReference, Settlement } from "./references";

/**
 * THE VALLO MONEY VOCABULARY (D50: Vallo presents, the provider holds).
 *
 * Every member money surface consumes these types and nothing else: never a
 * provider's own object, status or error. The adapter that turns a partner's
 * answer into them is Session 2's (R-3 to R-6 and the D50 adapter); until it
 * exists the reads in `lib/money/partner-reads.ts` answer `absent`, and every
 * surface draws its honest absent state.
 *
 * Integer kobo everywhere. Instants are ISO strings exactly as the record holds
 * them. Client-safe: types and pure helpers only.
 */

/**
 * A payment's state, in Vallo's words. Session 2's status normalisation (§8)
 * maps every partner status onto exactly one of these; a raw partner status
 * never reaches a member.
 */
export type PaymentStatus =
  | "awaiting_payment"
  | "processing"
  | "paid"
  | "protected"
  | "release_requested"
  | "released"
  | "refund_requested"
  | "refunding"
  | "refunded"
  | "in_review"
  | "failed"
  | "cancelled";

/** One thing that happened to a payment, as the record holds it. */
export type TimelineEventKind =
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
  | "cancelled";

export type TimelineEvent = {
  kind: TimelineEventKind;
  /** When it happened, or null for a step still to come. */
  at: string | null;
  amountMinor?: number | null;
};

/** Who is reading: the person who paid, or the owner or agent being paid. */
export type MoneyViewer = "payer" | "payee";

/** One payment as a member's surfaces see it. */
export type Payment = {
  id: string;
  rail: MoneyRail;
  settlement: Settlement;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  /** What it was for, as the space's own title. */
  spaceTitle: string;
  events: TimelineEvent[];
  references: MoneyReference[];
};

/**
 * The two numbers of the money centre (D50 section 3, FL section 4.3). Read
 * from the member's own account at the licensed partner; Vallo holds neither.
 */
export type Balances = {
  /** The member's to withdraw, at the partner. */
  availableMinor: number;
  /** Held by the partner in protected payments until their release condition. */
  protectedMinor: number;
  currency: string;
  /** The licensed partner holding it, named because the member must know (D50 condition 1). */
  heldBy: string;
  /** When the partner said so. A balance without a time is not shown. */
  asOf: string;
};

/**
 * A withdrawal quote: created as a payment intent at the partner, with the fee
 * READ BACK from the intent (D51). There is no quote without an intent, and no
 * quote whose fee was computed by Vallo from a table.
 */
export type WithdrawalQuote = {
  intentId: string;
  amountMinor: number;
  /** The partner's fee on the intent plus Vallo's band, as read back. */
  processingFeeMinor: number;
  /** What reaches the bank: amount less fee, as the partner states it. */
  receiveMinor: number;
  currency: string;
  /** The account the money goes to, as the bank resolved its name. */
  destination: { bankName: string; accountName: string; last4: string };
  /** The intent's own expiry. */
  expiresAt: string;
};

/** A receipt in the vault. */
export type Receipt = {
  /** The receipt's own number, when the record issued one. */
  number: string | null;
  paymentId: string;
  title: string;
  issuedAt: string;
  amountMinor: number;
  currency: string;
  kind: "payment" | "refund";
  /** Where the full receipt opens (with print and download). */
  href: string | null;
  /** The privacy-safe public view, when a share code exists. */
  shareHref: string | null;
  references: MoneyReference[];
};

/**
 * Whether a withdrawal quote may be confirmed: every figure present, the fee
 * real (read back, a whole non-negative number of kobo), the arithmetic exact,
 * and the intent not expired. Anything else and the screen waits, it never
 * shows an estimate dressed as a total.
 */
export function quoteIsConfirmable(quote: WithdrawalQuote | null, now: number): boolean {
  if (!quote) return false;
  const whole = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (!whole(quote.amountMinor) || !whole(quote.processingFeeMinor) || !whole(quote.receiveMinor)) return false;
  if (quote.amountMinor <= 0 || quote.receiveMinor <= 0) return false;
  if (quote.amountMinor - quote.processingFeeMinor !== quote.receiveMinor) return false;
  const expires = Date.parse(quote.expiresAt);
  return Number.isFinite(expires) && expires > now;
}
