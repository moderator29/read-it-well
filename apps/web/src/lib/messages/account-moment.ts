/**
 * THE ACCOUNT-NUMBER MOMENT (V-04): finding one in a message, and narrowing
 * which bank it can belong to. Client-safe and pure: no I/O, no logging.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS FOR THE RECEIVER.
 *
 * In this market the account number travels from the agent to the renter, and
 * the moment it is typed is the moment the platform loses the transaction.
 * `lib/messages/education.ts` holds the right words and shows them to the
 * person TYPING; `private.scan_message` files a flag to a queue the renter
 * never sees. The renter about to transfer the rent saw the digits and nothing
 * else. This module is how the thread knows, on the receiver's side, that a
 * message carries a number worth checking.
 *
 * ---------------------------------------------------------------------------
 * WHAT COUNTS AS AN ACCOUNT NUMBER.
 *
 * A NUBAN is exactly ten digits. People write it grouped ("0123 456 789"),
 * dashed, or run together, so the finder forgives single spaces, dots and
 * dashes between digits, and then insists on exactly ten. It refuses:
 *
 *   - a run that is part of a longer run of digits (an eleven-digit phone
 *     number, a reference code), because ten of its digits are not a number
 *     somebody gave;
 *   - a run preceded by +234 or 234, which is a phone number written
 *     internationally without its leading zero.
 *
 * A ten-digit phone number written without the zero ("8031234567") is
 * indistinguishable from a NUBAN and is kept. Resolving it costs one bounded
 * call and answers "unresolved", which prints nothing, so the false positive
 * is harmless and the false negative (skipping a real account number) is not.
 *
 * ---------------------------------------------------------------------------
 * NARROWING THE BANK, AND WHY IT MATTERS FOR MORE THAN SPEED.
 *
 * Resolving an account needs a bank code. Trying every bank would make this
 * feature a free "whose account is this" oracle across 25 banks, which is the
 * NDPA problem the entry names. So a check resolves AT MOST TWO banks:
 *
 *   1. a bank the message itself names ("GTB", "Opay", "First Bank"), or
 *   2. otherwise, the commercial banks whose NUBAN check digit this number
 *      satisfies (the CBN algorithm: weights 3,7,3 over the six-digit
 *      institution code and the nine-digit serial), and only when that
 *      leaves two or fewer.
 *
 * More than two candidates is "unresolved" rather than a wider search.
 */

/** Ten digits, forgiving single separators, as a finder over a message. */
const RUN_RE = /\d(?:[ .\-]?\d){9,}/g;

/** The ten-digit numbers a message carries, de-duplicated, in order. */
export function accountNumbersIn(body: string): string[] {
  const found: string[] = [];
  for (const match of body.matchAll(RUN_RE)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length !== 10) continue;
    const start = match.index ?? 0;
    const before = body.slice(Math.max(0, start - 5), start);
    const after = body.slice(start + match[0].length, start + match[0].length + 1);
    /* Part of a longer number on either side. */
    if (/\d$/.test(before) || /^\d/.test(after)) continue;
    /* A phone number written internationally, without its zero. */
    if (/(\+?234)[ .\-]?$/.test(before)) continue;
    if (!found.includes(digits)) found.push(digits);
  }
  return found;
}

/** Does this message look like somebody is being asked to pay an account? */
export function isAccountMoment(body: string): boolean {
  return accountNumbersIn(body).length > 0;
}

/** The last four digits: the only part of the number this platform keeps. */
export function lastFour(nuban: string): string {
  return nuban.replace(/\D/g, "").slice(-4);
}

/* ------------------------------------------------------------ check digit */

const WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3, 3, 7, 3] as const;

/**
 * Does `nuban` carry a valid check digit for this institution code?
 *
 * The CBN NUBAN algorithm over fifteen digits: the institution code padded to
 * six (a commercial bank's three-digit code becomes "000" plus it) and the
 * nine-digit serial, weighted 3,7,3 repeating; the check digit is 10 minus the
 * sum modulo 10, with 10 read as 0. Codes that are not three or six digits
 * (the processor's own codes for some microfinance banks) cannot be checked
 * and answer false, which only means they are not proposed as a candidate.
 */
export function nubanValidFor(institutionCode: string, nuban: string): boolean {
  if (!/^\d{10}$/.test(nuban)) return false;
  let code: string;
  if (/^\d{3}$/.test(institutionCode)) code = `000${institutionCode}`;
  else if (/^\d{6}$/.test(institutionCode)) code = institutionCode;
  else return false;
  const digits = `${code}${nuban.slice(0, 9)}`;
  let sum = 0;
  for (let i = 0; i < 15; i += 1) sum += Number(digits[i]) * WEIGHTS[i]!;
  const check = (10 - (sum % 10)) % 10;
  return check === Number(nuban[9]);
}

/* --------------------------------------------------------- bank from words */

/**
 * What people call a bank in a chat, mapped to a word in its registered name.
 * Matched on whole words, case-insensitive. A short alias only counts as a
 * whole word, so "uba" in "Cuba" is not a bank.
 */
export const BANK_ALIASES: ReadonlyArray<{ alias: RegExp; nameHas: RegExp }> = [
  { alias: /\b(gtb|gtbank|gt bank|guaranty)\b/i, nameHas: /guaranty/i },
  { alias: /\baccess\b/i, nameHas: /^access bank(?! .*diamond)/i },
  { alias: /\bzenith\b/i, nameHas: /zenith/i },
  { alias: /\b(uba|united bank for africa)\b/i, nameHas: /united bank for africa/i },
  { alias: /\b(first ?bank|fbn)\b/i, nameHas: /first bank/i },
  { alias: /\bfidelity\b/i, nameHas: /fidelity/i },
  { alias: /\bfcmb\b/i, nameHas: /first city monument/i },
  { alias: /\bunion ?bank\b/i, nameHas: /union bank/i },
  { alias: /\bsterling\b/i, nameHas: /sterling/i },
  { alias: /\bwema\b/i, nameHas: /wema/i },
  { alias: /\becobank\b/i, nameHas: /ecobank/i },
  { alias: /\bstanbic\b/i, nameHas: /stanbic/i },
  { alias: /\bpolaris\b/i, nameHas: /polaris/i },
  { alias: /\bkeystone\b/i, nameHas: /keystone/i },
  { alias: /\bheritage\b/i, nameHas: /heritage/i },
  { alias: /\bunity ?bank\b/i, nameHas: /unity bank/i },
  { alias: /\bjaiz\b/i, nameHas: /jaiz/i },
  { alias: /\bprovidus\b/i, nameHas: /providus/i },
  { alias: /\bopay\b/i, nameHas: /opay|paycom/i },
  { alias: /\bpalm ?pay\b/i, nameHas: /palmpay/i },
  { alias: /\bkuda\b/i, nameHas: /kuda/i },
  { alias: /\bmoniepoint\b/i, nameHas: /moniepoint/i },
  { alias: /\bvfd\b/i, nameHas: /vfd/i },
];

export type BankRef = { code: string; name: string };

/** Banks the message names, looked up in the live registry. */
export function banksNamedIn(body: string, registry: readonly BankRef[]): BankRef[] {
  const named: BankRef[] = [];
  for (const { alias, nameHas } of BANK_ALIASES) {
    if (!alias.test(body)) continue;
    for (const bank of registry) {
      if (nameHas.test(bank.name) && !named.some((b) => b.code === bank.code)) named.push(bank);
    }
  }
  return named;
}

/** The most banks one check may resolve against. See the header. */
export const MAX_CANDIDATES = 2;

/**
 * The banks worth asking about this number, or none. Never more than
 * `MAX_CANDIDATES`: a wider search is exactly the lookup service this must
 * not become.
 */
export function candidateBanks(nuban: string, body: string, registry: readonly BankRef[]): BankRef[] {
  const named = banksNamedIn(body, registry);
  if (named.length > 0) {
    /* A named bank the check digit refutes is still asked if it is the only
       one: the check digit covers commercial codes only, and the person was
       told a bank in words. Where several are named, the digit decides. */
    const agreeing = named.filter((bank) => nubanValidFor(bank.code, nuban));
    const pick = agreeing.length > 0 ? agreeing : named;
    return pick.length <= MAX_CANDIDATES ? pick : [];
  }
  const byDigit = registry.filter((bank) => nubanValidFor(bank.code, nuban));
  return byDigit.length <= MAX_CANDIDATES ? byDigit : [];
}
