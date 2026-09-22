import "server-only";

import { consume, ipFromHeaders, subjectForIp, subjectForUser } from "./rate-limit";

/**
 * Every money path, and how often one person may walk it (A2-046, W-2).
 *
 * ---------------------------------------------------------------------------
 * THE TABLE. Per signed-in user unless the row says otherwise. Windows are
 * fixed, matching `consume_rate_limit`. A denied call says when to try again.
 *
 * | Action                     | Bucket                  | Limit | Window | Why this number                                           |
 * | -------------------------- | ----------------------- | ----: | -----: | --------------------------------------------------------- |
 * | fundWallet                 | money_fund_start        |    10 |    1 h | Each call opens a hosted checkout; ten abandoned pages an hour is already odd |
 * | fundWalletWithSavedCard    | money_fund_saved_card   |     6 |    1 h | Charges a card with nobody present; a loop here blocks cards |
 * | chargeSavedCard            | card_charge             |    10 |   10 m | The shared saved-card door, counted on top of its callers  |
 * | withdraw (typed and saved) | money_withdraw          |     5 |    1 h | Each one holds balance and pays a transfer fee at Paystack |
 * | transferToUser             | money_transfer          |    10 |    1 h | Two ledger legs each; ten in an hour is far above a person |
 * | startCryptoDeposit         | money_crypto_start      |     6 |    1 h | Opens a Yellow Card payment page per call                 |
 * | verifyFunding              | money_verify            |    30 |   10 m | A Paystack verify call per hit; a redirect loop retries   |
 * | payWithWallet              | money_pay_wallet        |    10 |   10 m | Locks the wallet row per call                              |
 * | payWithSavedCard           | money_pay_saved_card    |     6 |   10 m | Charges a card per call, then card_charge counts too       |
 * | startCardCheckout          | money_checkout_start    |    10 |   10 m | Opens a hosted checkout per call                           |
 * | addBankAccount             | money_bank_add          |     5 |    1 h | Each one is a paid account resolution at Paystack          |
 * | resolveBankAccount, lookupAccountName | money_bank_resolve | 20 | 10 m | Paid per call; a person fixing a typo needs a handful   |
 * | startCardSetup             | card_setup              |     5 |    1 h | Each one is a small live charge to tokenise a card         |
 * | openHeldPayment            | money_hold_open         |     5 |    1 h | Each one takes an amount out of a spendable balance and locks the wallet row |
 * | signature failures, per IP | webhook_bad_signature   |    30 |   10 m | Unauthenticated: a sprayed webhook URL is answered from cache |
 * | cron secret failures, per IP | cron_bad_secret       |    30 |   10 m | Unauthenticated: same shape for the reconcile route        |
 *
 * WHERE THE GUARD SITS. After the session and the schema, before anything
 * that costs money or locks a row. Refusing after validation means a typo
 * does not spend a slot, and refusing before the processor call means a
 * refused call costs nothing.
 *
 * PER USER AND PER IP. A signed-in money action counts against the account,
 * because an account is what has a wallet. The two unauthenticated routes
 * (the webhooks, the reconcile route) count failures per address, because an
 * address is the only handle they have and a genuine delivery is never
 * limited: only a failed signature or secret is counted, so Paystack retrying
 * a real event is untouched.
 *
 * FAILS OPEN, as the limiter does (rate-limit.ts explains why). What this
 * file adds is the vocabulary: one place to read every limit, one function
 * to apply one, one honest sentence back.
 */

export type MoneyAction =
  | "fundWallet"
  | "fundWalletWithSavedCard"
  | "chargeSavedCard"
  | "withdraw"
  | "transferToUser"
  | "startCryptoDeposit"
  | "verifyFunding"
  | "payWithWallet"
  | "payWithSavedCard"
  | "startCardCheckout"
  | "addBankAccount"
  | "resolveBankAccount"
  | "startCardSetup"
  | "openHeldPayment";

export type MoneyLimit = {
  bucket: string;
  limit: number;
  windowSeconds: number;
  /** What the person is told, before "Try again in about ...". */
  refusal: string;
};

const HOUR = 60 * 60;
const TEN_MINUTES = 10 * 60;

export const MONEY_LIMITS: Record<MoneyAction, MoneyLimit> = {
  fundWallet: {
    bucket: "money_fund_start",
    limit: 10,
    windowSeconds: HOUR,
    refusal: "You have started several top-ups in the last hour, so this one was not opened and nothing was charged.",
  },
  fundWalletWithSavedCard: {
    bucket: "money_fund_saved_card",
    limit: 6,
    windowSeconds: HOUR,
    refusal: "You have charged your saved card several times in the last hour, so this one was not sent and nothing was charged.",
  },
  chargeSavedCard: {
    bucket: "card_charge",
    limit: 10,
    windowSeconds: TEN_MINUTES,
    refusal: "That is a lot of card charges at once, so this one was not sent and nothing was charged.",
  },
  withdraw: {
    bucket: "money_withdraw",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have asked for several withdrawals in the last hour, so this one was not sent. Your balance is untouched.",
  },
  transferToUser: {
    bucket: "money_transfer",
    limit: 10,
    windowSeconds: HOUR,
    refusal: "You have sent money several times in the last hour, so this transfer was not made. Your balance is untouched.",
  },
  startCryptoDeposit: {
    bucket: "money_crypto_start",
    limit: 6,
    windowSeconds: HOUR,
    refusal: "You have started several crypto top-ups in the last hour, so this one was not opened and nothing was charged.",
  },
  verifyFunding: {
    bucket: "money_verify",
    limit: 30,
    windowSeconds: TEN_MINUTES,
    refusal: "That payment has been checked many times in the last few minutes. If you completed it, your balance updates on its own.",
  },
  payWithWallet: {
    bucket: "money_pay_wallet",
    limit: 10,
    windowSeconds: TEN_MINUTES,
    refusal: "That is a lot of payment attempts at once, so this one was not made. Your balance is untouched and your dates are still held.",
  },
  payWithSavedCard: {
    bucket: "money_pay_saved_card",
    limit: 6,
    windowSeconds: TEN_MINUTES,
    refusal: "That is a lot of card payments at once, so this one was not sent. Nothing was charged and your dates are still held.",
  },
  startCardCheckout: {
    bucket: "money_checkout_start",
    limit: 10,
    windowSeconds: TEN_MINUTES,
    refusal: "You have opened several payment pages in the last few minutes, so this one was not opened. Nothing was charged and your dates are still held.",
  },
  addBankAccount: {
    bucket: "money_bank_add",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have added several bank accounts in the last hour, so this one was not saved.",
  },
  resolveBankAccount: {
    bucket: "money_bank_resolve",
    limit: 20,
    windowSeconds: TEN_MINUTES,
    refusal: "That account has been looked up many times in the last few minutes, so this check was not made.",
  },
  startCardSetup: {
    bucket: "card_setup",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have started several card setups already, so this one was not opened and nothing was charged.",
  },
  openHeldPayment: {
    bucket: "money_hold_open",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have held money several times in the last hour, so this one was not opened. Your balance is untouched.",
  },
};

/** The unauthenticated routes count failures per address, never successes. */
export const ROUTE_FAILURE_LIMITS = {
  webhookBadSignature: { bucket: "webhook_bad_signature", limit: 30, windowSeconds: TEN_MINUTES },
  cronBadSecret: { bucket: "cron_bad_secret", limit: 30, windowSeconds: TEN_MINUTES },
} as const;

export type MoneyGuardVerdict =
  | { allowed: true; degraded: boolean }
  | { allowed: false; message: string; retryAfterSeconds: number };

/**
 * Apply one row of the table to one person.
 *
 * The message is complete: what was not done, that nothing was charged, and
 * when to come back. A surface renders it as it is.
 */
export async function guardMoney(action: MoneyAction, userId: string): Promise<MoneyGuardVerdict> {
  const rule = MONEY_LIMITS[action];
  const verdict = await consume({
    bucket: rule.bucket,
    subject: subjectForUser(userId),
    limit: rule.limit,
    windowSeconds: rule.windowSeconds,
  });
  if (verdict.allowed) return { allowed: true, degraded: verdict.degraded };
  return {
    allowed: false,
    message: `${rule.refusal} Try again ${verdict.retryIn}.`,
    retryAfterSeconds: verdict.retryAfterSeconds,
  };
}

/**
 * Count one failed authentication against the caller's address.
 *
 * Returns false once the address has failed too often inside the window, at
 * which point the route answers 429 from the deny cache and does no HMAC
 * work, writes no log line and records no alert for that attempt.
 */
export async function countRouteFailure(
  rule: (typeof ROUTE_FAILURE_LIMITS)[keyof typeof ROUTE_FAILURE_LIMITS],
  headers: Headers,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const verdict = await consume({
    bucket: rule.bucket,
    subject: subjectForIp(ipFromHeaders(headers)),
    limit: rule.limit,
    windowSeconds: rule.windowSeconds,
  });
  if (verdict.allowed) return { allowed: true, retryAfterSeconds: 0 };
  return { allowed: false, retryAfterSeconds: verdict.retryAfterSeconds };
}
