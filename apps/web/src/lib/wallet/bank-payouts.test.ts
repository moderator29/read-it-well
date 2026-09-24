import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_PAYOUT_ANSWER,
  BANK_PAYOUTS_OPEN,
  TERMS_REFUND_LINE,
  WALLET_MONEY_NEXT,
  WALLET_MONEY_USES,
} from "./bank-payouts";
import { getDictionary } from "@vallo/i18n";

const en = getDictionary("en");

/**
 * MON-04: while bank payouts do not complete, nothing a person reads may say
 * money can be moved from the wallet to a bank, and every sentence that
 * describes getting money out names what is true today (spend it, send it)
 * without promising a date.
 */

const WEB = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(WEB, path), "utf8");

/** The copy sites MON-04 and UX-13 named, by file. */
const SITES = [
  "lib/legal/terms.tsx",
  "app/(site)/cancellations/page.tsx",
  "app/(site)/help/page.tsx",
  "app/(site)/delete-account/page.tsx",
  "lib/email/messages.ts",
  "lib/email/escrow-messages.ts",
  "lib/support/faq.ts",
  "app/(site)/safety/page.tsx",
  "app/(site)/docs/chapters.tsx",
  "lib/email/payment-instrument-messages.ts",
];

/** Sentences that promised a way out to a bank. */
const RETIRED = [
  /you move money\s+from there to your bank/i,
  /move it\s+to your Nigerian bank account from the wallet whenever you want/i,
  /withdraw to your own Nigerian bank account/i,
  /Moving it from the wallet to your bank is an ordinary withdrawal/i,
  /or withdraw it to your bank account\./i,
  /or withdraw it to your bank from the wallet whenever you want/i,
  /You can spend it or withdraw it to your bank/i,
  /Funding, withdrawals and transfers need the payment provider/i,
  /your earnings are paid to the Nigerian bank account you added during your application/i,
  /Card reversals are slower/i,
  /you move (it|them) to your bank from there/i,
  /Withdraw it to your bank whenever you want it/i,
  /withdraw to\s+a Nigerian bank account, send money/i,
  /you can move money to a Nigerian bank\s+account whenever you want/i,
  /From there, withdraw to your bank/i,
  /a withdrawal you have started is held out of what you can spend/i,
  /move it to your Nigerian bank account from Wallet whenever you want/i,
];

describe("bank payouts are closed, and the copy says so (MON-04)", () => {
  it("is closed today", () => {
    expect(BANK_PAYOUTS_OPEN).toBe(false);
  });

  it("says what wallet money can do today, and that a bank withdrawal is not available yet", () => {
    for (const sentence of [WALLET_MONEY_USES, WALLET_MONEY_NEXT, TERMS_REFUND_LINE]) {
      expect(sentence).toMatch(/spen[dt]/i);
      expect(sentence).toMatch(/send|sent/i);
      expect(sentence).toMatch(/not available yet/i);
      expect(sentence).toMatch(/once bank payouts open/i);
    }
    expect(AGENT_PAYOUT_ANSWER).toMatch(/not open yet/i);
  });

  it("promises no date", () => {
    for (const sentence of [WALLET_MONEY_USES, WALLET_MONEY_NEXT, TERMS_REFUND_LINE, AGENT_PAYOUT_ANSWER]) {
      expect(sentence).not.toMatch(/\b(19|20)\d\d\b|january|february|march|april|may |june|july|august|september|october|november|december|within \d|in \d+ (days|weeks)/i);
    }
  });

  it.each(SITES)("%s no longer promises a bank withdrawal", (path) => {
    const source = read(path);
    for (const retired of RETIRED) expect(source).not.toMatch(retired);
  });

  it("the landing and the deletion blocker say what is true", () => {
    const flat = JSON.stringify(en);
    expect(flat).not.toContain("Top up, pay, withdraw, on both sides.");
    expect(flat).not.toContain("and withdraw to your own account");
    expect(en.settings.delete.blockerWalletBalanceCta).toBe("Spend or send it");
    expect(en.settings.delete.blockerWalletBalanceBeforePayouts).toMatch(/contact support/i);
    expect(en.settings.delete.blockerWalletBalanceBeforePayouts).toMatch(/not available yet/i);
  });

  it("every surface reads the one switch", () => {
    for (const path of [
      "lib/legal/terms.tsx",
      "app/(site)/cancellations/page.tsx",
      "app/(site)/help/page.tsx",
      "lib/email/messages.ts",
      "lib/email/escrow-messages.ts",
      "lib/support/faq.ts",
      "app/(app)/settings/DeleteAccountPanel.tsx",
      "components/app/payments/PaymentMethodsPanel.tsx",
      "app/(site)/safety/page.tsx",
      "app/(site)/docs/chapters.tsx",
      "lib/email/payment-instrument-messages.ts",
    ]) {
      expect(read(path)).toMatch(/bank-payouts"/);
    }
  });
});
