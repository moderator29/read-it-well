/**
 * The refusal when a hold stops a new or changed payout or bank account
 * (SQLSTATE RM050). The database sends one undated sentence for every hold
 * (20260929015959): a compliance hold is never described to its owner, so
 * this never names a cause or a date either (SCUML items 6 and 8). A dated
 * sentence is passed through only in the database's own "until" form, which
 * it sends for nothing but the member's own hold.
 *
 * Client-safe: pure.
 */

export const MONEY_HOLD_CODE = "RM050";

export const NEUTRAL_HOLD_REFUSAL = "A new payout account cannot be added to this account right now.";

const OWN_HOLD_PREFIX = "A new payout account cannot be added to this account until ";

type MaybeError = { code?: string | null; message?: string | null } | null | undefined;

/** The sentence to show when `error` is the money hold, or null when it is not. */
export function moneyHoldRefusal(error: MaybeError): string | null {
  if (!error || error.code !== MONEY_HOLD_CODE) return null;
  const message = (error.message ?? "").trim();
  return message.startsWith(OWN_HOLD_PREFIX) ? message : NEUTRAL_HOLD_REFUSAL;
}
