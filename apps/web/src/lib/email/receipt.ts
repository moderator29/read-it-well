import type { Dictionary, Locale } from "@vallo/i18n/core";
import { stayReceipt, type ReceiptModel, type StayReceiptSource } from "@/components/app/money/receipt-model";
import { successCopy } from "@/lib/ui/success-moments";
import type { EmailMessage } from "./messages";
import { appUrl, button, compose, fitSubject, heading, hello, paragraph, receiptBlock } from "./render";

/**
 * THE RECEIPT EMAIL (north star 16.5, D23; W9, 6 October 2026).
 *
 * "A receipt email matches the on-screen receipt exactly, because a receipt
 * that differs looks forged." So this email does not describe a receipt: it
 * draws the receipt, from the one `ReceiptModel` the app's document sheet
 * draws (`components/app/money/receipt-model.ts`, `ReceiptSheet.tsx`), in
 * the same order with the same labels and the same figures, character for
 * character. `receipt.test.ts` renders both and holds them equal.
 *
 * The words around it are the ones the payer already read on the success
 * moment (`success` in the dictionary, through `successCopy`), not new money
 * sentences: the title as the subject and display line, the line under it as
 * the consequence. The rail is the receipt's own note, Session 2's
 * `NO_CUSTODY_SENTENCE`.
 *
 * Presentation only. Nothing here sends; registering it on the outbox under
 * `payment.receipt` is Session 2's (request R-21 in the W9 report). It is a
 * pure value like every other message, so it can be rendered and tested
 * without a network.
 */
export type PaymentReceiptData = {
  name?: string | null;
  /** The receipt, exactly as the app draws it. */
  receipt: ReceiptModel;
  /** The subject and display line: the success moment's title. */
  title: string;
  /** The consequence, in one sentence: the success moment's line. */
  line: string;
  /** The button's words and where it goes (the booking that holds the receipt). */
  action: { label: string; href: string };
  /** Why this arrived, for the footer. */
  footerWhy: string;
};

export function paymentReceipt(data: PaymentReceiptData): EmailMessage {
  const lead = `${hello(data.name)} ${data.line}`;
  const subject = fitSubject(data.title, data.receipt.title);
  const preheader = `${data.receipt.figureLabel}: ${data.receipt.figure}.`;
  const composed = compose({
    icon: "paymentReceipt",
    preheader,
    blocks: [heading(data.title), paragraph(lead), receiptBlock(data.receipt), button(data.action.label, data.action.href)],
    footerLines: [data.footerWhy],
  });
  return { subject, preheader: composed.preheader, html: composed.html, text: composed.text };
}

/**
 * A paid stay's receipt email, from the same read the checkout and the
 * booking page draw their receipt from. Null when the stay is not paid: there
 * is no receipt email for money that has not moved, for the same reason there
 * is no receipt on screen.
 */
export function stayReceiptMessage(input: {
  source: StayReceiptSource;
  bookingId: string;
  t: Dictionary;
  locale: Locale;
  name?: string | null;
}): EmailMessage | null {
  const receipt = stayReceipt(input.source, input.t, input.locale);
  if (!receipt) return null;
  const words = successCopy(input.t.success, input.source.status === "CONFIRMED" || input.source.status === "COMPLETED" ? "stayPaid" : "stayPaidRecorded");
  return paymentReceipt({
    name: input.name ?? null,
    receipt,
    title: words.title,
    line: words.body,
    action: { label: input.t.experienceMoney.email.openReceipt, href: appUrl(`/bookings/${encodeURIComponent(input.bookingId)}`) },
    footerWhy: input.t.experienceMoney.email.footerWhy,
  });
}
