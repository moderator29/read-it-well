import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import type { WalletEntryKind } from "@/lib/wallet/types";

/**
 * What each kind of movement is called and what it looks like.
 *
 * Extracted from `TransactionsSection` because three surfaces now name the
 * same nine kinds - the statement, the recent strip on the wallet home and the
 * receipt - and three private copies of a nine-key map is how a deposit ends up
 * called "Deposit" in one place and "Wallet funding" in another. The ledger has
 * one vocabulary; so does the interface.
 */

export const KIND_ICON: Record<WalletEntryKind, BrandIconName> = {
  deposit: "wallet-secure",
  withdrawal: "naira-hand",
  payment: "card-lock",
  refund: "shield-check",
  transfer_in: "user-check",
  transfer_out: "user-check",
  escrow_hold: "shield-lock",
  escrow_release: "shield-check",
  escrow_refund: "shield-check",
};

export const KIND_LABEL: Record<WalletEntryKind, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  payment: "Payment",
  refund: "Refund",
  transfer_in: "Transfer received",
  transfer_out: "Transfer sent",
  /* Escrow money is wallet money and it shows in this one statement, so it
     needs words a payer recognises rather than the enum's own vocabulary.
     "Held in escrow" says where the money is; the other two say where it
     went. */
  escrow_hold: "Held in escrow",
  escrow_release: "Escrow released",
  escrow_refund: "Escrow refunded",
};
