import { formatMoney, type Locale } from "@vallo/i18n";
import { COMPANY_LEGAL_NAME, COMPANY_RC_NUMBER } from "../legal/company";

/**
 * MON-16. What "Share" sends from a receipt.
 *
 * It used to be "<kind> · <date> · <reference>": no amount, no counterparty
 * and no issuer, which proves nothing to a landlord who asks for proof of
 * payment. It now carries the amount and its direction, the date and time in
 * Lagos, what the ledger says the movement was (the counterparty is in the
 * note), the property when there is one, the status, the reference, and who
 * issued it.
 */
export function receiptShareText(input: {
  kindLabel: string;
  direction: "credit" | "debit";
  amountMinor: number;
  when: string;
  note: string | null;
  property: string | null;
  statusLabel: string;
  reference: string;
  locale?: Locale;
}): string {
  const issuer = COMPANY_RC_NUMBER ? `${COMPANY_LEGAL_NAME}, RC ${COMPANY_RC_NUMBER}` : COMPANY_LEGAL_NAME;
  return [
    `Vallo wallet receipt: ${input.kindLabel}`,
    `${input.direction === "credit" ? "Money in" : "Money out"}: ${formatMoney(input.amountMinor, input.locale)}`,
    `Date: ${input.when} (Lagos time)`,
    input.note ? `Details: ${input.note}` : null,
    input.property ? `Property: ${input.property}` : null,
    `Status: ${input.statusLabel}`,
    `Reference: ${input.reference}`,
    `Issued by ${issuer}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
