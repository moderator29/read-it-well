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
