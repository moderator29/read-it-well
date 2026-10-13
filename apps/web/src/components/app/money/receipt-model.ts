import { formatMoney, formatNumber, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { NO_CUSTODY_SENTENCE } from "@/lib/money/copy";

/**
 * ONE RECEIPT, TWO RENDERERS (north star 16.5, D23; handoff Stage 4 and 8B).
 *
 * "A receipt email matches the on-screen receipt exactly, because a receipt
 * that differs looks forged." The only way two renderings of one receipt stay
 * identical is for neither to compose it: this module turns the record a page
 * read into a `ReceiptModel` of finished strings, once, and both the document
 * sheet on screen (`ReceiptSheet.tsx`) and the email (`lib/email/receipt.ts`)
 * draw exactly those strings, in exactly this order. Neither renderer formats
 * a figure, picks a label or decides a row; a row that is not in the model is
 * on neither, and a row in the model is on both.
 *
 * Pure and client-safe: no reads, no React, no CSS. It decides nothing about
 * the money either. Every figure, state and date is the caller's, read from
 * the record; this only says it.
 *
 * WHAT IT REFUSES TO PRINT. No reference unless the record carries one (R-7
 * asks Session 2 for the provider reference on the checkout read), no
 * confirmation row unless that confirmation is a fact in the record, no hash,
 * no barcode, no id the record did not supply. The rail is said through the
 * one sentence that is true of every payment Vallo takes today
 * (`NO_CUSTODY_SENTENCE`, Session 2's): the processor split the charge in
 * the same transaction. Escrow is never mentioned, because no receipt on this
 * platform is for an escrowed payment yet, and implying both protections is
 * the one thing a receipt must not do (handoff Stage 4, honesty rule 1).
 */

/** One line of the receipt, already in words. */
export type ReceiptRow = { label: string; value: string };

/**
 * One confirmation the record holds (reference 7082's "Confirmed" rows). It
 * exists only when the confirmation happened: there is no "waiting" variant,
 * because a receipt states what is true and a step not taken is not a row.
 */
export type ReceiptConfirmation = { label: string; state: string };

export type ReceiptModel = {
  /** The quiet word above the title: "Receipt". */
  kind: string;
  /** What was paid for: the stay, the home. */
  title: string;
  /** Where it is, or empty. */
  place: string;
  /** The label above the hero figure. */
  figureLabel: string;
  /** The hero figure, formatted once, exact to the kobo. */
  figure: string;
  /** The facts of the stay or tenancy: dates, party. */
  facts: ReceiptRow[];
  /** The itemised lines, each formatted once, in the record's order. */
  lines: ReceiptRow[];
  /** The total row under the rule; the same figure as `figure`. */
  total: ReceiptRow;
  /** Zero, one or two confirmations, each one a fact. */
  confirmations: ReceiptConfirmation[];
  /** The reference, only when the record carries one. */
  reference: ReceiptRow | null;
  /** The rail, in Session 2's sentence. */
  note: string;
};

/** The parts of a stay the receipt needs: `CheckoutView` satisfies this. */
export type StayReceiptSource = {
  title: string;
  location: string;
  dateRange: string;
  nights: number;
  guests: number;
  lines: readonly { label: string; minor: number }[];
  totalMinor: number;
  currency: string;
  status: string;
  /** A SUCCESSFUL transaction row against this booking, and nothing else. */
  paid: boolean;
  /** The processor's reference, once the read carries it (R-7). */
  reference?: string | null;
};

/** Money exactly as the receipt states it: through `formatMoney`, kobo when there is kobo. */
export function receiptMoney(minor: number, locale: Locale, currency: string): string {
  return formatMoney(minor, locale, currency);
}

/**
 * A paid stay's receipt, or null when the stay is not paid. Null is the
 * point: a receipt for money that has not moved is the forgery this module
 * exists to make impossible, so there is no unpaid receipt to draw.
 */
export function stayReceipt(source: StayReceiptSource, t: Dictionary, locale: Locale): ReceiptModel | null {
  if (!source.paid) return null;
  const c = t.checkout;
  const r = t.experienceMoney.receipt;
  const figure = receiptMoney(source.totalMinor, locale, source.currency);
  const confirmations: ReceiptConfirmation[] = [{ label: r.payment, state: r.confirmed }];
  /* The second "Confirmed" is the host's, and it is only a fact once the
     booking says so. A stay settled before the host answered carries one row. */
  if (source.status === "CONFIRMED" || source.status === "COMPLETED") {
    confirmations.push({ label: r.booking, state: r.confirmed });
  }
  const reference = source.reference?.trim();
  return {
    kind: r.kind,
    title: source.title,
    place: source.location,
    figureLabel: t.afterTheGate.tenancy.totalPaid,
    figure,
    facts: [
      { label: c.dates, value: source.dateRange },
      /* Guests and nights are two facts, so two rows: a row's label is what it
         is called, and the count of guests never carries the length of stay. */
      { label: c.guests, value: plural(source.guests, t.counts.guests, locale) },
      { label: r.nights, value: formatNumber(source.nights, locale) },
    ],
    lines: source.lines.map((line) => ({ label: line.label, value: receiptMoney(line.minor, locale, source.currency) })),
    total: { label: t.afterTheGate.tenancy.totalPaid, value: figure },
    confirmations,
    reference: reference ? { label: t.success.detail.reference, value: reference } : null,
    note: NO_CUSTODY_SENTENCE,
  };
}
