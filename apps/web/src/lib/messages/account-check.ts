import { businessNamesMatch, namesMatch } from "@/lib/identity/name-match";
import { accountNumbersIn, candidateBanks, lastFour, type BankRef } from "./account-moment";

/**
 * THE ACCOUNT CHECK ITSELF (V-04): whose account is this, asked once, for the
 * person about to pay it, and answered as a boolean.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT ANSWERS AND WHAT IT NEVER SAYS.
 *
 * It resolves the holder name of a ten-digit number the LISTER sent into a
 * listing thread, compares it with the names Vallo verified for that lister,
 * and stores one of five outcomes with the bank code and the last four
 * digits. It never stores the number, never stores the resolved name, never
 * returns the resolved name to anybody, and never tells the SENDER anything.
 * Showing the name would make Vallo a free lookup service for strangers'
 * account names (the entry's NDPA point); a boolean protects the renter
 * without that.
 *
 *   match              the holder is the verified lister
 *   no_match           the holder is somebody else
 *   unresolved         no bank could be narrowed to two, or the bank did not
 *                      know the number, or the processor was unreachable
 *   no_verified_name   the lister has no verified name to compare against,
 *                      so no claim either way is possible
 *   limited            this conversation used its checks for the day
 *
 * Only the first two print a sentence about ownership. The other three print
 * nothing about it, because each is a fact about Vallo, not about the account.
 *
 * ---------------------------------------------------------------------------
 * WHY IT RUNS ONLY WHEN THE LISTER SENT THE NUMBER. The comparison is with the
 * lister's verified name. A renter typing their own account number (a refund,
 * a caution return) has nothing to be compared with, and checking it would be
 * the oracle again.
 *
 * ---------------------------------------------------------------------------
 * PURE ORCHESTRATION, EVERY EFFECT INJECTED. The processor, the bank
 * registry, the verified names, the rate limit and the write are all handed
 * in, so the whole decision is proven under vitest with a stub resolver (the
 * processor's secret key is not present outside production). The production
 * wiring is `account-check-run.ts`.
 */

export type AccountCheckOutcome = "match" | "no_match" | "unresolved" | "no_verified_name" | "limited";

export type AccountCheckRow = {
  message_id: string;
  conversation_id: string;
  bank_code: string | null;
  last4: string | null;
  name_matches_lister: boolean | null;
  outcome: AccountCheckOutcome;
};

export type VerifiedName = { kind: "person" | "business"; name: string };

/** Does a bank's holder name match any name on record, each by its own rule? */
export function holderMatches(holder: string, names: readonly VerifiedName[]): boolean {
  return names.some((n) =>
    n.kind === "business" ? businessNamesMatch(holder, n.name).match : namesMatch(holder, n.name).match,
  );
}

export type ResolveAnswer =
  | { ok: true; accountName: string }
  | { ok: false; failure: "unconfigured" | "not-confirmed" | "unreachable" };

export type AccountCheckDeps = {
  /** Ask the bank whose account this is. Production: `resolveBankAccountName`. */
  resolve(input: { accountNumber: string; bankCode: string }): Promise<ResolveAnswer>;
  /** The live bank registry. May throw; a throw is "unresolved". */
  banks(): Promise<BankRef[]>;
  /** The names Vallo verified for this lister: a person's legal and payout names, a firm's CAC name. */
  verifiedNames(listerUserId: string): Promise<VerifiedName[]>;
  /** One unit of this conversation's daily allowance. False means refused OR unknown. */
  consume(conversationId: string): Promise<boolean>;
  /** Write the row. Idempotent on message id. */
  save(row: AccountCheckRow): Promise<void>;
};

export type AccountCheckInput = {
  messageId: string;
  conversationId: string;
  senderId: string;
  /** `conversations.agent_id`: the lister side of this thread. */
  listerUserId: string | null;
  body: string;
};

/**
 * Check the first account number in a message, if the lister sent it.
 * Returns the row it wrote, or null when nothing was checked at all.
 */
export async function runAccountCheck(
  deps: AccountCheckDeps,
  input: AccountCheckInput,
): Promise<AccountCheckRow | null> {
  if (!input.listerUserId || input.senderId !== input.listerUserId) return null;
  const nuban = accountNumbersIn(input.body)[0];
  if (!nuban) return null;

  const base = {
    message_id: input.messageId,
    conversation_id: input.conversationId,
    last4: lastFour(nuban),
  };
  const write = async (row: AccountCheckRow) => {
    await deps.save(row);
    return row;
  };

  /* The allowance comes first, before any name is read or any bank asked. */
  if (!(await deps.consume(input.conversationId))) {
    return write({ ...base, bank_code: null, name_matches_lister: null, outcome: "limited" });
  }

  const names = (await deps.verifiedNames(input.listerUserId)).filter((n) => n.name.trim() !== "");
  if (names.length === 0) {
    return write({ ...base, bank_code: null, name_matches_lister: null, outcome: "no_verified_name" });
  }

  let registry: BankRef[];
  try {
    registry = await deps.banks();
  } catch {
    return write({ ...base, bank_code: null, name_matches_lister: null, outcome: "unresolved" });
  }

  const candidates = candidateBanks(nuban, input.body, registry);
  let firstResolvedBank: string | null = null;
  let resolvedAny = false;
  for (const bank of candidates) {
    const answer = await deps.resolve({ accountNumber: nuban, bankCode: bank.code });
    if (!answer.ok) continue;
    resolvedAny = true;
    firstResolvedBank ??= bank.code;
    if (holderMatches(answer.accountName, names)) {
      return write({ ...base, bank_code: bank.code, name_matches_lister: true, outcome: "match" });
    }
  }
  if (resolvedAny) {
    return write({ ...base, bank_code: firstResolvedBank, name_matches_lister: false, outcome: "no_match" });
  }
  return write({ ...base, bank_code: null, name_matches_lister: null, outcome: "unresolved" });
}

/* ------------------------------------------------------ the receiver's card */

/** How the receiver's card reads a stored outcome, or its absence. */
export type AccountCardState = "checking" | "belongs" | "does_not_belong" | "silent";

/** How long a missing row reads as "checking" before it reads as nothing. */
export const CHECKING_WINDOW_MS = 60_000;

/**
 * The card's ownership line. A missing row on a fresh message is "checking";
 * a missing row on an old message, and the three outcomes that are facts about
 * Vallo rather than the account, print nothing about ownership at all.
 */
export function accountCardState(
  outcome: AccountCheckOutcome | null,
  messageCreatedAt: string | null,
  now: number,
): AccountCardState {
  if (outcome === "match") return "belongs";
  if (outcome === "no_match") return "does_not_belong";
  if (outcome !== null) return "silent";
  const sent = messageCreatedAt ? Date.parse(messageCreatedAt) : Number.NaN;
  return Number.isFinite(sent) && now - sent < CHECKING_WINDOW_MS ? "checking" : "silent";
}
