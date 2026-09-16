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

export const KIND_LABEL: Record<WalletEntryKind, string> = {
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
 * "failed" or "reversed" in lower-case English on a platform that ships in
 * four languages, on the one screen where somebody is checking what happened
 * to their money. These are still English, because the dictionary has no keys
 * for them yet and inventing a fifth place where money words are written by
 * hand is what produced the problem; they are at least written as sentences a
 * person reads rather than as the column's own vocabulary.
 *
 * PENDING says what is happening AND what to expect, because pending is the
 * most anxious state in this product and a single word answers neither
 * question.
 */
export const STATUS_LABEL: Record<WalletEntryStatus, string> = {
  PENDING: "Going through",
  COMPLETED: "Done",
  FAILED: "Did not go through",
  REVERSED: "Reversed",
};
