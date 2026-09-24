/**
 * What a payment failure is allowed to say to the person who tried to pay.
 *
 * ---------------------------------------------------------------------------
 * `result.error` WAS REACHING THE SCREEN UNFILTERED.
 *
 * `ActionResult` is `{ ok: false, error: string }` and nothing constrains what
 * goes in that string. Its own docstring asks for plain language and never raw
 * codes, and an asking docstring is not a boundary: every refusal in
 * `lib/bookings/checkout.ts`, every refusal in everything it calls, and every
 * refusal in the shared session, flag, idempotency and rate-limit helpers can
 * put a sentence in front of somebody who has just tried to pay rent. Two of
 * those are already wrong today. `NOT_CONFIGURED_MESSAGE` in
 * `lib/actions/session.ts` says a feature "switches on the moment the platform
 * keys land", and `CARD_UNCONFIGURED_MESSAGE` in `lib/bookings/checkout.ts`
 * says the same thing about payment keys. Both are our deployment made the
 * guest's problem, in our own words, on the money screen.
 *
 * So this is the boundary the envelope does not have. Nothing the server says
 * reaches the reader unless it passes through here, and whatever it says, the
 * caller still appends the one sentence the reader actually came for, which is
 * whether their money moved.
 *
 * ---------------------------------------------------------------------------
 * WHY A FILTER AND NOT A CODE TABLE.
 *
 * The right shape is a refusal code on the envelope, mapped to copy here. That
 * needs `lib/actions/envelope.ts` and every checkout action to change, which is
 * a wider blast radius than a copy fix earns and is not this owner's to make.
 * It is written up as a recommendation instead. What is here works with what
 * the envelope actually carries today: the server's refusals are already
 * written sentences, so the honest job is to let a written sentence through, to
 * rewrite the two that carry infrastructure jargon, and to drop anything that
 * is neither.
 *
 * WHAT WAS TRIED AND REJECTED. An allow-list of the exact sentences
 * `checkout.ts` can return was written first and thrown away: those constants
 * are module-private, so the list would be a hand-copied duplicate of eighteen
 * strings that nothing keeps in step, and the first time somebody edited a full
 * stop the guest would silently start getting the fallback instead of the real
 * reason. A shape test cannot drift.
 *
 * "Something went wrong" is never returned from here, on purpose. It answers
 * nothing and costs the reader the one fact they need.
 */

/**
 * Our own internals, said out loud. These are not unknown strings to be
 * dropped: they are known strings that say a true thing in the wrong words, so
 * each is answered with the same fact in words that belong to the reader.
 */
const REWRITES: { pattern: RegExp; sentence: string }[] = [
  {
    /*
     * `CARD_UNCONFIGURED_MESSAGE` in `lib/bookings/checkout.ts`,
     * `NOT_CONFIGURED_MESSAGE` in `lib/actions/session.ts`, and anything else
     * that refuses because a key is missing rather than because the guest did
     * something. See F2-023: the most expensive instance of F2-003, because the
     * person reading it is trying to pay.
     *
     * ONE SENTENCE FOR BOTH, AND NOT "CARD PAYMENT IS NOT AVAILABLE". The same
     * two constants can arrive on the wallet path as well as the card path, and
     * naming the wrong method would be a second false statement on top of the
     * first. This one is true whichever button was pressed, and the caller's
     * money sentence follows it either way.
     */
    pattern: /\b(payment|platform|paystack)\s+keys?\b|\bswitch(es)?\s+on\b/i,
    sentence: "We cannot take this payment right now.",
  },
];

/**
 * Shapes that are not a sentence somebody wrote for a reader. A raw enum, a
 * dumped payload, a stack, a URL, a Postgres code. Anything matching is
 * dropped rather than shown, because a reader learns nothing from it and it
 * tells anybody watching more about our internals than they should have.
 */
const NOT_PROSE: RegExp[] = [
  /[\n\r]/, //                     more than one line: a stack or a dump
  /[{}<>\\]|\|\|/, //              JSON, markup, a path, a logical operator
  /\bhttps?:\/\//i, //             a URL
  /\b[A-Za-z]+Error\b/, //         TypeError, PaystackError, AuthApiError
  /\bPGRST\d/, //                  a PostgREST code
  /*
   * A SQLSTATE, which `tests/checkout.spec.mjs` bans by name: it lists 23505
   * and 23P01 among the strings that must never reach this screen. Five
   * characters, all digits or two digits and three alphanumerics.
   *
   * SAFE AGAINST MONEY, and that was the thing to check before adding it. Every
   * figure this surface produces goes through `formatMoney`, which is
   * `Intl.NumberFormat`, which groups thousands in all four of our locales, so
   * an amount is never an unbroken five-digit run: ₦95,000.00 is "95" and "000"
   * to this pattern and neither matches.
   */
  /\b\d{5}\b|\b\d{2}[A-Z][0-9A-Z]{2}\b/,
  /[a-f0-9]{8}-[a-f0-9]{4}-/i, //  a uuid, which is an id we do not explain
  /^[^\s]+$/, //                   one token: `not_pending`, `insufficient`
  /\b(supabase|postgres|rls|jwt|env|undefined|null)\b/i,
  /*
   * And the empty sentences, which are the ones the brief bans by name. They
   * pass every shape test above because they are grammatical English; they are
   * dropped because they tell the reader nothing and displace the one fact that
   * would have. The caller's money sentence is strictly better than any of
   * them.
   */
  /\bsomething went wrong\b/i,
  /\ban? (unexpected|unknown) error\b/i,
  /\ban error (occurred|has occurred)\b/i,
];

/** The longest a refusal can reasonably be before it is a dump, not a message. */
const MAX_LENGTH = 400;

/**
 * The server's refusal, as the reader is allowed to see it, or null when there
 * is nothing safe to show. The caller always states what happened to the money
 * either way, so returning null costs the reader nothing they needed.
 */
export function vettedFailureSentence(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (text.length === 0 || text.length > MAX_LENGTH) return null;

  for (const { pattern, sentence } of REWRITES) {
    if (pattern.test(text)) return sentence;
  }
  for (const pattern of NOT_PROSE) {
    if (pattern.test(text)) return null;
  }
  return text;
}

/**
 * A failure's consequence line: the vetted reason when there is one, then the
 * sentence about the money, which is said whether or not there was a reason.
 * The money sentence is last because it is the one that has to survive being
 * skim-read.
 */
export function failureConsequence(raw: string | undefined | null, money: string): string {
  const reason = vettedFailureSentence(raw);
  return reason ? `${reason} ${money}` : money;
}

/* ------------------------------------------------------------ paid screens */

/*
 * V-33: WHAT A SUCCESS SCREEN MAY SAY ABOUT WHERE THE MONEY WENT.
 *
 * These screens used to tell the payer the agent had been paid. Nothing paid
 * the agent: no payout to a bank exists, and the charge credited nobody. A
 * success screen is read at the most anxious second of the transaction, so it
 * states only what the ledger already proves (the charge is recorded to the
 * kobo) and what the reader should do next. It never claims a payout, and
 * `payment-copy.test.ts` fails if any of these sentences starts to.
 */

/** The rent page when it is opened again after a paid charge. */
export const RENT_PAID_PAGE_CONSEQUENCE =
  "The move-in total is paid and recorded to the kobo. Arrange the keys with the agent in your thread.";

/** The sheet that opens the moment a rent payment confirms. */
export const RENT_PAID_SHEET_CONSEQUENCE =
  "The move-in total is paid and recorded to the kobo. Arrange the keys with the agent in your thread.";

/** The sheet that opens the moment a stay payment confirms. */
export const STAY_PAID_SHEET_CONSEQUENCE =
  "Paid and recorded to the kobo, and these dates are yours.";
