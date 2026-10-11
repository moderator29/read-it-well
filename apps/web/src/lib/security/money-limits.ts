import "server-only";

import { consume, ipFromHeaders, subjectForIp, subjectForUser } from "./rate-limit";
import { passcodeMoneyRefusal } from "../passcode/money";

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
 * | confirmCardSetup           | card_setup_confirm      |    30 |   10 m | Polled on the same backoff, and each hit is a Paystack verify, so tighter than paymentState |
 * | holdMoney                  | money_hold_open         |     5 |    1 h | Each one takes an amount out of a spendable balance and locks the wallet row |
 * | startSubscriptionCheckout  | subscription_checkout_start | 6 |   1 h | Opens a hosted checkout per call, and may create a plan at Paystack |
 * | subscriptionCheckoutState  | subscription_state_poll |    30 |   10 m | Polled on the checkout's backoff; each hit may be a Paystack verify |
 * | cancelSubscription         | subscription_cancel     |     5 |    1 h | One Paystack call per press; a person cancels once         |
 * | signature failures, per IP | webhook_bad_signature   |    30 |   10 m | Unauthenticated: a sprayed webhook URL is answered from cache |
 * | cron secret failures, per IP | cron_bad_secret       |    30 |   10 m | Unauthenticated: same shape for the reconcile route        |
 *
 * WHERE THE GUARD SITS. After the session and the schema, before anything
 * that costs money or locks a row. Refusing after validation means a typo
 * does not spend a slot, and refusing before the processor call means a
 * refused call costs nothing.
 *
 * PER USER AND PER IP. A signed-in money action counts against the account,
 * because an account is what pays. The two unauthenticated routes
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
  | "chargeSavedCard"
  | "payWithSavedCard"
  | "startCardCheckout"
  | "addBankAccount"
  | "resolveBankAccount"
  | "startCardSetup"
  | "fileGuaranteeClaim"
  | "setDefaultPaymentMethod"
  | "removePaymentMethod"
  | "setDefaultBankAccount"
  | "removeBankAccount"
  | "paymentState"
  | "confirmCardSetup"
  | "cryptoQuote"
  | "cryptoStart"
  | "cryptoState"
  | "balanceSetup"
  | "balanceLookup"
  | "balanceMove"
  | "balanceState"
  | "startSubscriptionCheckout"
  | "subscriptionCheckoutState"
  | "cancelSubscription";

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
  chargeSavedCard: {
    bucket: "card_charge",
    limit: 10,
    windowSeconds: TEN_MINUTES,
    refusal: "That is a lot of card charges at once, so this one was not sent and nothing was charged.",
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
  /* Track A: a Guarantee claim is money out of the reserve, reviewed by a
     person. Counted so a stolen session cannot flood the desk. */
  fileGuaranteeClaim: {
    bucket: "guarantee_claim_file",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have filed several claims in the last hour, so this one was not filed.",
  },
  startCardSetup: {
    bucket: "card_setup",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have started several card setups already, so this one was not opened and nothing was charged.",
  },

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
  /* B-6. The card-setup checkout polls this on the same backoff as
     `paymentState` (about twelve hits in ninety seconds), but each hit is a
     Paystack verify, so it is sized for two setups in the window rather than
     three. Like `paymentState` it only reads the outcome of a charge already
     made, so the refusal must not say the check failed. */
  confirmCardSetup: {
    bucket: "card_setup_confirm",
    limit: 30,
    windowSeconds: TEN_MINUTES,
    refusal: "We have asked about that card many times in the last few minutes and have stopped for now. This does not mean it failed: if it went through, the card shows on this page once it is saved.",
  },
  /* Crypto (lib/crypto/actions.ts). A quote costs a provider call, so it is
     counted like opening a payment page. The status poll is sized like
     `paymentState`: one honest payment polls for up to the quote's life. */
  cryptoQuote: {
    bucket: "money_crypto_quote",
    limit: 12,
    windowSeconds: TEN_MINUTES,
    refusal: "You have asked for several crypto quotes in the last few minutes, so this one was not fetched. Nothing has been paid.",
  },
  cryptoStart: {
    bucket: "money_crypto_start",
    limit: 6,
    windowSeconds: TEN_MINUTES,
    refusal: "You have opened several crypto payments in the last few minutes, so this one was not opened. Nothing has been paid.",
  },
  cryptoState: {
    bucket: "money_crypto_state",
    limit: 60,
    windowSeconds: TEN_MINUTES,
    refusal: "We have looked up that crypto payment many times and have stopped for now. This does not mean it failed: the payment page updates when the provider reports.",
  },
  /* The member balance (lib/money/member-wallet-actions.ts). Every one of
     these spends a request from the provider's ten a minute for the whole
     platform, so they are sized well under it per person. */
  balanceSetup: {
    bucket: "money_balance_setup",
    limit: 4,
    windowSeconds: TEN_MINUTES,
    refusal: "You have tried to set up your balance several times in the last few minutes, so this one was not sent.",
  },
  balanceLookup: {
    bucket: "money_balance_lookup",
    limit: 12,
    windowSeconds: TEN_MINUTES,
    refusal: "You have looked up several accounts in the last few minutes, so this one was not looked up. Nothing has moved.",
  },
  balanceMove: {
    bucket: "money_balance_move",
    limit: 8,
    windowSeconds: TEN_MINUTES,
    refusal: "You have started several money movements in the last few minutes, so this one was not sent. Nothing has moved.",
  },
  balanceState: {
    bucket: "money_balance_state",
    limit: 40,
    windowSeconds: TEN_MINUTES,
    refusal: "We have asked about that movement many times in the last few minutes and have stopped for now. This does not mean it failed: this page updates on its own when it settles.",
  },
  /* Vallo Pro and Vallo Business (lib/subscriptions/actions.ts). Opening a
     checkout may create a plan at Paystack and always initialises a
     transaction; the state poll is a Paystack verify per hit until the
     webhook lands, sized like confirmCardSetup; a cancel is one Paystack call. */
  startSubscriptionCheckout: {
    bucket: "subscription_checkout_start",
    limit: 6,
    windowSeconds: HOUR,
    refusal: "You have opened several plan checkouts in the last hour, so this one was not opened and nothing was charged.",
  },
  subscriptionCheckoutState: {
    bucket: "subscription_state_poll",
    limit: 30,
    windowSeconds: TEN_MINUTES,
    refusal: "We have asked about that payment many times in the last few minutes and have stopped for now. This does not mean it failed: if it went through, your plan shows on the Vallo Pro page once it is confirmed.",
  },
  cancelSubscription: {
    bucket: "subscription_cancel",
    limit: 5,
    windowSeconds: HOUR,
    refusal: "You have tried to cancel several times in the last hour, so this one was not sent. Nothing has changed.",
  },
};

/** The unauthenticated routes count failures per address, never successes. */
export const ROUTE_FAILURE_LIMITS = {
  webhookBadSignature: { bucket: "webhook_bad_signature", limit: 30, windowSeconds: TEN_MINUTES },
  cronBadSecret: { bucket: "cron_bad_secret", limit: 30, windowSeconds: TEN_MINUTES },
} as const;

/** Reads of a payment already made; never refused by the passcode lock. */
const PASSCODE_EXEMPT: ReadonlySet<MoneyAction> = new Set<MoneyAction>(["paymentState", "confirmCardSetup", "cryptoState", "cryptoQuote", "balanceState", "subscriptionCheckoutState"]);

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
  /* A locked session (docs/PASSCODE.md) moves nothing, and spends no slot
     finding that out. The status polls are exempt: they read the outcome of
     a payment already made, and a lock must not hide whether it went through. */
  if (!PASSCODE_EXEMPT.has(action)) {
    const locked = await passcodeMoneyRefusal(userId);
    if (locked) return { allowed: false, message: locked, retryAfterSeconds: 0 };
  }
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
