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
 * English on their own money history, and the ledger's status pill printed
 * `entry.status.toLowerCase()`, which is the raw database enum. The platform
 * ships in four languages and the money surface is the last place to leave
 * untranslated. F2-008.
 *
 * WHY A FUNCTION AND NOT A DICTIONARY READ AT EACH CALL SITE. Three surfaces
 * name the same thirteen values; three private lookups is exactly how a deposit
 * ends up called one thing on the ledger and another on its own receipt, which
 * is the fault this file was extracted to stop. One function, three callers.
 *
 * ---------------------------------------------------------------------------
 * THE ENGLISH FALLBACK IS GONE, AND ITS GOING IS THE POINT.
 *
 * This file carried its own `KIND_LABEL_EN` and `STATUS_LABEL_EN` and merged
 * the dictionary over them key by key, because `packages/i18n` belongs to
 * another owner and the keys did not exist yet. They exist now, in all four
 * locales, so the merge has become the one thing it was never meant to be: a
 * second English copy of thirteen strings that nothing keeps in step with the
 * dictionary, and a silent catch for a key deleted by accident. A missing key
 * would have rendered English on a Hausa phone and nothing would have said so.
 *
 * `Dictionary` is `typeof en`, so `wallet.entryKind` and `wallet.entryStatus`
 * are required and exhaustively typed. Deleting a locale's key, or adding a
 * tenth `WalletEntryKind` without a word for it, is now a compile error in this
 * file rather than an English word on somebody's statement.
 */
export type WalletWords = {
  kind: Record<WalletEntryKind, string>;
  status: Record<WalletEntryStatus, string>;
};

export function walletWords(locale: Locale): WalletWords {
  const { entryKind, entryStatus } = getDictionary(locale).wallet;
  return { kind: entryKind, status: entryStatus };
}
