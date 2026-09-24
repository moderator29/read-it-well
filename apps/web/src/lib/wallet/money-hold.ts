/**
 * SEC-15: the 7-day money hold after support moves an account to a new email
 * address. The database refuses money leaving the account (withdrawals,
 * sends, wallet payments, escrow holds, new or repointed bank accounts) with
 * SQLSTATE RM050 and a sentence that already carries the end date, in Lagos
 * time. Every door that can hit it shows that sentence instead of a generic
 * failure, so a held person learns why and until when.
 *
 * Client-safe: pure.
 */

import { PAYOUTS_CLOSED_MESSAGE } from "./bank-payouts";

export const MONEY_HOLD_CODE = "RM050";

const FALLBACK =
  "Money cannot leave this account for 7 days after its email address was changed by support. Your balance is untouched.";

type MaybeError = { code?: string | null; message?: string | null } | null | undefined;

/** The sentence to show when `error` is the money hold, or null when it is not. */
export function moneyHoldRefusal(error: MaybeError): string | null {
  if (!error || error.code !== MONEY_HOLD_CODE) return null;
  const message = (error.message ?? "").trim();
  return message.startsWith("Money cannot leave this account until ") ? `${message} Your balance is untouched.` : FALLBACK;
}

/** The ledger's refusal of a withdrawal hold while bank payouts are closed (payout gate). */
export const PAYOUTS_CLOSED_CODE = "RM051";

/**
 * The closed-payouts sentence when `error` is the ledger's payout gate, or
 * null. The app refuses first on its own switch, so this is reached only if
 * the two switches ever disagree; the person is then told the truth rather
 * than "try again".
 */
export function payoutsClosedRefusal(error: MaybeError): string | null {
  return error && error.code === PAYOUTS_CLOSED_CODE ? PAYOUTS_CLOSED_MESSAGE : null;
}
