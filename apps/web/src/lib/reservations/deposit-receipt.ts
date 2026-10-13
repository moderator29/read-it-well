import { formatMoney, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { ReceiptModel } from "@/components/app/money/receipt-model";

/**
 * A TABLE DEPOSIT'S RECEIPT, ON THE ONE RECEIPT MODEL (track/restaurant-deposits).
 *
 * `ReceiptSheet` draws a `ReceiptModel` and nothing else; this turns a paid
 * deposit into one, once, in finished strings. A receipt exists only for
 * money that moved, so `depositReceipt` answers null for a deposit that is
 * still due or open. Every confirmation row is a fact on the record: paid
 * (it has a paid time), taken off the bill (applied), sent back (refunded).
 * Pure and client-safe.
 */

export type DepositReceiptSource = {
  venueName: string;
  location: string;
  /** The table's time, already in words. */
  when: string;
  partySize: number;
  status: string;
  amountMinor: number;
  paidAt: string | null;
  reference: string | null;
};

const MOVED = new Set(["paid", "applied", "forfeited", "refund_due", "refunded"]);

export function depositReceipt(
  d: DepositReceiptSource,
  t: { deposits: Dictionary["tableDeposits"]; counts: Dictionary["counts"] },
  locale: Locale,
): ReceiptModel | null {
  if (!d.paidAt || !MOVED.has(d.status)) return null;
  const w = t.deposits.receipt;
  const p = t.deposits.page;
  const figure = formatMoney(d.amountMinor, locale, "NGN");
  const confirmations: ReceiptModel["confirmations"] = [{ label: w.paid, state: w.paidState }];
  if (d.status === "applied") confirmations.push({ label: w.applied, state: w.appliedState });
  if (d.status === "refunded") confirmations.push({ label: w.refunded, state: w.refundedState });
  return {
    kind: w.kind,
    title: d.venueName,
    place: d.location,
    figureLabel: w.figureLabel,
    figure,
    facts: [
      { label: p.when, value: d.when },
      { label: p.party, value: plural(d.partySize, t.counts.guests, locale) },
      { label: p.howPaid, value: p.cardOnly },
    ],
    lines: [{ label: w.line, value: figure }],
    total: { label: w.total, value: figure },
    confirmations,
    reference: d.reference ? { label: w.reference, value: d.reference } : null,
    note: w.note,
  };
}
