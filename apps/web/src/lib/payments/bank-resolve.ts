import "server-only";

import { z } from "zod";

import {
  PaystackError,
  isPaystackConfigured,
  listBanks as fetchBanks,
  resolveAccountNumber,
  type PaystackBank,
} from "./paystack";

/**
 * THE ONE PLACE THAT DECIDES WHAT A VALID NIGERIAN BANK ACCOUNT IS.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS.
 *
 * There were already two front doors onto the same Paystack call before this
 * file, and they did not agree:
 *
 *   `resolveBankAccount` (payments/bank-accounts-actions.ts) is the payout
 *   side. It takes any non-empty bank code, hands it straight to Paystack,
 *   and answers in the `ActionResult` envelope.
 *
 *   `lookupAccountName` (wallet/actions.ts) was the withdraw sheet's courtesy
 *   read. It refused, silently, any bank code that was not one of the twenty
 *   three in `wallet/banks.ts`, and answered in a shape of its own.
 *
 * So a person could file a Jaiz, Sparkle or VFD account on the payments
 * settings page and then be told nothing at all by the withdraw sheet for the
 * same account. Two callers, two opinions about which banks exist, one
 * processor underneath. A third caller with a third opinion is how money ends
 * up at the wrong account, so the send desk does not get one: the body moves
 * here and every caller asks this.
 *
 * THE SECOND OPINION IS GONE AS WELL, 23 September. `withdrawSchema` no longer
 * checks a bank code against `wallet/banks.ts`; `withdraw` and
 * `lookupAccountName` both ask `lookupBank` below, which is the same live
 * registry the payments settings page and the send desk ask. `WALLET_BANKS`
 * survives as a picker's seed on the withdraw sheet and as nothing else: it validates nothing, and no money path reads it.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS HERE AND WHAT IS DELIBERATELY NOT.
 *
 * Here: the digits rule, the bank registry and its cache, the single resolve
 * call with its failures told apart, and the comparison that decides whether
 * two names are the same name.
 *
 * Not here: sessions, rate limits, the envelope, anything that writes. Each
 * caller keeps its own guard and its own copy, because a settings page, a
 * withdraw sheet and a send screen refuse in different words and at different
 * moments. What they must never differ on is the answer to "whose account is
 * this", and that is the whole of what this file owns.
 *
 * NOTHING HERE LOGS. An account number and an account holder's name are both
 * personal data (rule 16), and a shared helper is exactly where a convenience
 * `console.log` would end up sitting over every money path at once.
 */

/* ------------------------------------------------------------ the digits */

/** Bare digits, whatever the field was typed or pasted with. */
export function normaliseAccountNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** A NUBAN is exactly ten digits. Grouping, spaces and dashes are forgiven. */
export const accountNumberSchema = z
  .string({ message: "Enter the ten digit account number." })
  .transform(normaliseAccountNumber)
  .refine((value) => /^\d{10}$/.test(value), "A Nigerian account number is exactly ten digits.");

/* ------------------------------------------------------------ the banks */

/** The registry changes rarely and the pages ask often. One hour, in memory. */
const BANKS_TTL_MS = 60 * 60 * 1000;
let banksCache: { at: number; banks: PaystackBank[] } | null = null;

/**
 * The live registry, cached per instance. Throws what `fetchBanks` throws, so
 * a caller that can carry on without a bank list can catch and a caller that
 * cannot must refuse.
 */
export async function cachedBanks(): Promise<PaystackBank[]> {
  const now = Date.now();
  if (banksCache && now - banksCache.at < BANKS_TTL_MS) return banksCache.banks;
  const banks = await fetchBanks();
  banksCache = { at: now, banks };
  return banks;
}

/**
 * Why a bank code did not become a bank.
 *
 *   `unconfigured`     no processor key in this environment, so there is no
 *                      registry to check against and nothing may proceed on
 *                      the assumption that the code is good.
 *   `unreachable`      the registry could not be read. THIS IS NOT THE SAME
 *                      FACT AS A BAD CODE and it must never be answered with
 *                      "choose a bank from the list", because the list the
 *                      person is being sent back to is the one we could not
 *                      read. Trying again may work.
 *   `unknown-code`     the registry was read and this code is not in it. The
 *                      person can fix that by choosing again.
 */
export type BankLookupFailure = "unconfigured" | "unreachable" | "unknown-code";

export type BankLookup =
  | { ok: true; code: string; name: string }
  | { ok: false; failure: BankLookupFailure };

/**
 * IS THIS A REAL NIGERIAN BANK, ASKED OF THE LIVE REGISTRY.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS REPLACED A FUNCTION THAT RETURNED `string | null`.
 *
 * `bankNameForCode` answered `null` for three different facts about the
 * world: no key, no registry, no such bank. Every caller therefore said the
 * same sentence for all three, and one of those sentences was a lie. Telling
 * somebody to "choose a bank from the list" when the outage IS the list sends
 * them back to a picker to make the same choice again, and they will read the
 * second refusal as the platform calling their bank fake.
 *
 * ---------------------------------------------------------------------------
 * A REGISTRY THAT CANNOT BE READ IS A REFUSAL, NEVER A PASS.
 *
 * This is the load-bearing line of the whole module. `withdrawSchema` used to
 * check the code against a hand-typed list of twenty three, which is why the
 * withdraw sheet could not pay a Kuda, Opay, Palmpay, Moniepoint, Sparkle,
 * VFD or Jaiz account that the payments settings page had happily stored. The
 * fix is to ask the live registry instead, and the whole risk in that fix is
 * that the registry is a network call: an implementation that shrugged and
 * let the code through on an unreachable registry would have widened a LIVE
 * PAYOUT PATH to "any string is a bank". So the failure branch refuses, and
 * `ok: true` is returned only when a registry was actually read and actually
 * contained the code.
 */
export async function lookupBank(rawCode: string): Promise<BankLookup> {
  const code = rawCode.trim();
  if (code.length === 0) return { ok: false, failure: "unknown-code" };
  if (!isPaystackConfigured()) return { ok: false, failure: "unconfigured" };

  let banks: PaystackBank[];
  try {
    banks = await cachedBanks();
  } catch {
    return { ok: false, failure: "unreachable" };
  }

  const bank = banks.find((entry) => entry.code === code);
  if (!bank) return { ok: false, failure: "unknown-code" };
  return { ok: true, code: bank.code, name: bank.name };
}

/* ---------------------------------------------------------- the resolve */

/**
 * Why a resolve did not produce a name. The three are different facts about
 * the world and callers word them differently:
 *
 *   `unconfigured`   no processor key in this environment. Nobody can be
 *                    confirmed, so nothing that depends on confirmation may
 *                    proceed.
 *   `not-confirmed`  the bank answered and does not know this account. The
 *                    number or the bank is wrong, and the person can fix it.
 *   `unreachable`    the processor could not be reached or failed in a way
 *                    that is not about this account. Trying again may work.
 */
export type ResolveFailure = "unconfigured" | "not-confirmed" | "unreachable";

export type BankAccountResolution =
  | { ok: true; accountNumber: string; accountName: string }
  | { ok: false; failure: ResolveFailure };

/**
 * Ask the bank whose account this is. Reads nothing, writes nothing, moves
 * nothing.
 *
 * THE NAME THAT COMES BACK IS THE BANK'S. It is never read from a row this
 * platform stored, never inferred from a profile, and never taken from the
 * caller. That is the entire value of the confirmation step: a person is
 * checking a stranger's ten digits against the name the bank holds, and a
 * cached or guessed name would show them their own typing back.
 */
export async function resolveBankAccountName(input: {
  accountNumber: string;
  bankCode: string;
}): Promise<BankAccountResolution> {
  if (!isPaystackConfigured()) return { ok: false, failure: "unconfigured" };

  const accountNumber = normaliseAccountNumber(input.accountNumber);
  const bankCode = input.bankCode.trim();
  if (!/^\d{10}$/.test(accountNumber) || bankCode.length === 0) {
    return { ok: false, failure: "not-confirmed" };
  }

  try {
    const resolved = await resolveAccountNumber(accountNumber, bankCode);
    return { ok: true, accountNumber, accountName: resolved.accountName };
  } catch (error) {
    /* A PaystackError is the processor having answered: it knows this account
       or it does not. Anything else is the socket, the timeout or a thrown
       programming error, none of which say anything about the account. */
    return { ok: false, failure: error instanceof PaystackError ? "not-confirmed" : "unreachable" };
  }
}

/* ------------------------------------------------- comparing two answers */

/**
 * Case, spacing and punctuation folded away. Banks return the same holder as
 * "ADAOBI  O. NWOSU" one minute and "Adaobi O Nwosu" the next, and refusing a
 * send over a full stop would teach people that the check is noise.
 */
export function normaliseAccountName(raw: string): string {
  return raw
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Are these the same holder?
 *
 * ORDER IS NOT FOLDED AWAY, deliberately. "NGOZI ADAOBI" and "ADAOBI NGOZI"
 * are two different people at two different banks often enough that treating
 * them as one would be the platform deciding it knows better than the person
 * reading the screen. An empty answer is never equal to anything.
 */
export function sameAccountName(a: string, b: string): boolean {
  const left = normaliseAccountName(a);
  if (left.length === 0) return false;
  return left === normaliseAccountName(b);
}
