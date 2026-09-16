import { getDictionary, type Locale } from "@vallo/i18n";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import type { WalletEntryKind, WalletEntryStatus } from "@/lib/wallet/types";

/**
 * What each kind of movement is called and what it looks like.
 *
 * Extracted from `TransactionsSection` because three surfaces now name the
 * same nine kinds - the statement, the recent strip on the wallet home and the
 * receipt - and three private copies of a nine-key map is how a deposit ends up
 * called "Deposit" in one place and "Wallet funding" in another. The ledger has
 * one vocabulary; so does the interface.
 */

/*
 * THE MARK CARRIES THE DIRECTION, WHICH IS THE WHOLE POINT OF A LEDGER ROW.
 *
 * It did not. `transfer_in` and `transfer_out` were both `user-check`, and
 * `refund`, `escrow_release` and `escrow_refund` were all `shield-check`, so
 * the most important fact on a statement row - which way the money went - was
 * carried only by a plus or a minus and a colour. Rule 13 says colour is never
 * the only signal, and a statement where every row looks the same is a
 * statement nobody scans.
 *
 * Money arriving takes `payment-received`, money leaving takes `payment-sent`
 * or `wallet-out`, and a transfer between people takes the arrow that means a
 * transfer. `deposit` and `withdrawal` take the two wallet marks that were
 * drawn for exactly this pair. `escrow_hold` keeps the padlock, because a hold
 * is the one movement where the money has stopped rather than gone anywhere.
 */
export const KIND_ICON: Record<WalletEntryKind, BrandIconName> = {
  deposit: "wallet-plus",
  withdrawal: "wallet-out",
  payment: "payment-sent",
  refund: "payment-received",
  transfer_in: "payment-received",
  transfer_out: "transfer-arrow",
  escrow_hold: "shield-lock",
  escrow_release: "payment-received",
  escrow_refund: "payment-received",
};

/**
 * The English names, which are now the fallback rather than the answer.
 *
 * See `walletWords` at the foot of this file for why they are still written
 * here at all.
 */
const KIND_LABEL_EN: Record<WalletEntryKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  payment: "Payment",
  refund: "Refund",
  transfer_in: "Transfer received",
  transfer_out: "Transfer sent",
  /*
     A HOLD IS DESCRIBED, NOT NAMED AFTER A MECHANISM WE DO NOT OPERATE.
     These read "Held in escrow", "Escrow released" and "Escrow refunded", and
     `lib/legal/terms.tsx` says in bold that Vallo does not hold your money in
     escrow. See the note at the head of `BalanceBreakdownSheet`. The three
     kinds are unreachable today - `escrows` holds zero rows and nothing routes
     a payment into it - and if one ever renders it will say where the money is
     without claiming who is holding it. */
  escrow_hold: "On hold",
  escrow_release: "Hold released",
  escrow_refund: "Hold returned",
};

/**
 * What an unsettled movement is called, as a person would say it.
 *
 * The ledger rendered `entry.status.toLowerCase()`, so a row read "pending",
 * "failed" or "reversed" in lower-case English.
 *
 * PENDING says what is happening AND what to expect, because pending is the
 * most anxious state in this product and a single word answers neither
 * question.
 */
const STATUS_LABEL_EN: Record<WalletEntryStatus, string> = {
  PENDING: "Going through",
  COMPLETED: "Done",
  FAILED: "Did not go through",
  REVERSED: "Reversed",
};

/* ----------------------------------------------------------------- the words */

/**
 * The money words, in the reader's language.
 *
 * ---------------------------------------------------------------------------
 * THE WALLET WAS THE LAST SCREEN STILL SPEAKING ONE LANGUAGE.
 *
 * `KIND_LABEL` and `STATUS_LABEL` were exported constant English records read
 * by three surfaces: the statement, the recent strip on the wallet home, and
 * the receipt somebody sends to a landlord. A Yorùbá, Hausa or Igbo reader got
 * "Withdrawal", "Transfer sent", "Going through" and "Did not go through" in
 * English on their own money history. The platform ships in four languages and
 * the money surface is the last place to leave untranslated.
 *
 * WHY A FUNCTION AND NOT A DICTIONARY READ AT EACH CALL SITE. Three surfaces
 * name the same thirteen values; three private lookups is exactly how a deposit
 * ends up called one thing on the ledger and another on its own receipt, which
 * is the fault this file was extracted to stop. One function, three callers.
 *
 * WHY IT FALLS BACK RATHER THAN DEMANDING THE KEYS. `packages/i18n` belongs to
 * another owner and the keys are not there yet, so this reads them if they
 * exist and uses the English above if they do not. The alternative was to wait,
 * which leaves the call sites hard-coded and the fix un-landed, or to add the
 * keys across four locale files that are not this owner's to edit. The shape
 * below is the contract: the moment `wallet.entryKind` and `wallet.entryStatus`
 * land in the dictionary, every wallet surface speaks four languages with no
 * further change here. The exact keys are listed in the sprint report.
 *
 * The cast is deliberately narrow: it widens `Dictionary` by exactly the two
 * optional branches being looked for, so a typo in a key name is still a type
 * error once the keys exist, and nothing else about the dictionary is loosened.
 */
type WalletWordKeys = {
  wallet?: {
    entryKind?: Partial<Record<WalletEntryKind, string>>;
    entryStatus?: Partial<Record<WalletEntryStatus, string>>;
  };
};

export type WalletWords = {
  kind: Record<WalletEntryKind, string>;
  status: Record<WalletEntryStatus, string>;
};

export function walletWords(locale: Locale): WalletWords {
  const words = (getDictionary(locale) as unknown as WalletWordKeys).wallet;

  const kind = { ...KIND_LABEL_EN };
  for (const key of Object.keys(kind) as WalletEntryKind[]) {
    const translated = words?.entryKind?.[key];
    if (translated) kind[key] = translated;
  }

  const status = { ...STATUS_LABEL_EN };
  for (const key of Object.keys(status) as WalletEntryStatus[]) {
    const translated = words?.entryStatus?.[key];
    if (translated) status[key] = translated;
  }

  return { kind, status };
}
