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
 * | setDefaultPaymentMethod    | card_default            |    20 |   10 m | No money moves, but it decides which card the next charge hits |
 * | removePaymentMethod        | card_remove             |    10 |    1 h | A scripted loop here empties somebody's wallet of its cards |
 * | setDefaultBankAccount      | bank_default            |    20 |   10 m | It decides where the next payout lands, which is the whole account |
 * | removeBankAccount          | bank_remove             |    10 |    1 h | Same shape as removing a card, on the side money leaves by |
 * | paymentState               | money_state_poll        |    40 |   10 m | Polled on a backoff: one in-app checkout spends about 12   |
 * | holdMoney                  | money_hold_open         |     5 |    1 h | Each one takes an amount out of a spendable balance and locks the wallet row |
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
  | "holdMoney"
  | "setDefaultPaymentMethod"
  | "removePaymentMethod"
  | "setDefaultBankAccount"
  | "removeBankAccount"
  | "paymentState";

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
  /*
   * THE KEY IS `holdMoney` AND THE BUCKET IS UNCHANGED, 23 SEPTEMBER. It used
   * to be `openHeldPayment`, after the server action of that name, and that
   * action is retired: one call that opened an agreement and funded it, with a
   * funding reference it had to invent because the row did not exist yet. The
   * BUCKET STRING IS DELIBERATELY NOT RENAMED. `money_hold_open` is the key
   * `consume_rate_limit` counts against in the database, so renaming it would
   * hand everybody who is mid-window a fresh allowance. The name above is what
   * this codebase calls the limit; the string below is what the counter is.
   */
  holdMoney: {
    bucket: "money_hold_open",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have held money several times in the last hour, so this one was not opened. Your balance is untouched.",
  },

  /* ---------------------------------------------------------------------
     THE FOUR BELOW SPEND NOTHING, AND THEY ARE HERE ANYWAY.

     Everything above this line is priced: a processor call, a held balance,
     a locked row. These four are ordinary database updates and cost us a
     fraction of a penny each. They are counted because of what they DECIDE
     rather than what they spend. The default card is the card the next
     charge lands on; the default bank account is where the next payout
     lands. An attacker with a stolen session cannot read a card token and
     cannot file a bank account whose name the bank did not confirm, but
     until now they could flip which of somebody's own rows is the default
     as many times a second as the network allowed, and soft-delete every
     card on the account in one loop with nothing counting.

     The windows are wider than the money rows because a person genuinely
     tidying their cards taps more often than a person paying: twenty
     default changes in ten minutes is already a person who has stopped
     meaning it, and ten removals in an hour is more cards than anybody on
     this platform has.
     --------------------------------------------------------------------- */

  setDefaultPaymentMethod: {
    bucket: "card_default",
    limit: 20,
    windowSeconds: TEN_MINUTES,
    refusal: "You have changed your default card several times just now, so this change was not made. Your cards are as they were.",
  },
  removePaymentMethod: {
    bucket: "card_remove",
    limit: 10,
    windowSeconds: HOUR,
    refusal: "You have removed several cards in the last hour, so this one was not removed. Your cards are as they were.",
  },
  setDefaultBankAccount: {
    bucket: "bank_default",
    limit: 20,
    windowSeconds: TEN_MINUTES,
    refusal: "You have changed your default account several times just now, so this change was not made. Your accounts are as they were.",
  },
  removeBankAccount: {
    bucket: "bank_remove",
    limit: 10,
    windowSeconds: HOUR,
    refusal: "You have removed several accounts in the last hour, so this one was not removed. Your accounts are as they were.",
  },

  /*
   * THE ONE ROW SIZED FOR A MACHINE RATHER THAN A PERSON, AND THE TEST THAT
   * REFUSED THE FIRST ATTEMPT AT IT.
   *
   * `paymentState` is polled by the in-app checkout, so unlike every other
   * row here it is not sized for a human tapping. The first version polled
   * every two seconds for ninety and therefore wanted an allowance of a
   * hundred and fifty. `money-limits.test.ts` refused it: no row may exceed
   * sixty, and that guardrail is right. A limit high enough to accommodate
   * any loop somebody writes is not a limit, it is a formality, and the whole
   * complaint about this platform's fourteen money guards was that not one of
   * them had ever refused anything.
   *
   * So the LOOP changed rather than the ceiling. The checkout now backs off
   * (two seconds, then easing out to ten) and reaches the same ninety-second
   * horizon in about twelve requests instead of forty-five. That is better
   * engineering regardless: the webhook usually lands inside two seconds, so
   * the early checks are where the answer actually is and the late ones are
   * only waiting. Forty is three complete payments inside the window, and it
   * still stops an open loop dead.
   *
   * The refusal copy is written for the person, not the poll, because that is
   * who ends up reading it: it must not say the payment failed, because this
   * action has never known that and the money may well have moved.
   */
  paymentState: {
    bucket: "money_state_poll",
    limit: 40,
    windowSeconds: TEN_MINUTES,
    refusal: "We have checked that payment many times in the last few minutes and have stopped for now. This does not mean it failed: if it went through, this page updates on its own.",
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
