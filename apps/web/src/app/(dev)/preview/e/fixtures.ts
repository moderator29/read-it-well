import type { WalletEntry } from "@/lib/wallet/types";
import type { BalanceBreakdown } from "@/lib/wallet/types";
import type { PaymentMethod } from "@/lib/payments/methods";
import type { BankAccount } from "@/lib/payments/bank-accounts-actions";
import { COUNTERPART, HOTEL } from "../_fixtures/people";

/**
 * Worker E's fixtures for the preview harness. Brand-neutral, invented,
 * shaped exactly like the real types and the crypto contract, and used by
 * nothing outside `(dev)/preview/e`. Never the proof of the ONE LAW; only
 * the proof of the look.
 */

const DAY = 86_400_000;
const NOW = Date.now();

function at(daysAgo: number, hour: number, minute: number): string {
  const d = new Date(NOW - daysAgo * DAY);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const BALANCE_MINOR = 245_680_00;

export const ENTRIES: WalletEntry[] = [
  {
    id: "00000000-0000-4000-8000-00000000e001",
    kind: "transfer_out",
    direction: "debit",
    amountMinor: 50_000_00,
    reference: "rm-p2p-6f1c2a3e-out",
    status: "COMPLETED",
    createdAt: at(1, 13, 14),
    note: `Transfer to ${COUNTERPART.name}`,
  },
  {
    id: "00000000-0000-4000-8000-00000000e002",
    kind: "transfer_in",
    direction: "credit",
    amountMinor: 30_000_00,
    reference: "rm-p2p-9a8b7c6d-in",
    status: "COMPLETED",
    createdAt: at(2, 18, 32),
    note: "Transfer from Chidinma Okafor",
  },
  {
    id: "00000000-0000-4000-8000-00000000e003",
    kind: "payment",
    direction: "debit",
    amountMinor: 120_000_00,
    reference: "rm-book-2f4e6a8c",
    status: "COMPLETED",
    createdAt: at(3, 16, 21),
    note: "Hotel booking",
    property: `${HOTEL.name}, ${HOTEL.city}`,
  },
  {
    id: "00000000-0000-4000-8000-00000000e004",
    kind: "withdrawal",
    direction: "debit",
    amountMinor: 15_000_00,
    reference: "rm-wd-1b3d5f7a",
    status: "PENDING",
    createdAt: at(4, 9, 3),
  },
  {
    id: "00000000-0000-4000-8000-00000000e005",
    kind: "deposit",
    direction: "credit",
    amountMinor: 200_000_00,
    reference: "rm-fund-4c6e8a0b",
    status: "COMPLETED",
    createdAt: at(5, 20, 45),
  },
  {
    id: "00000000-0000-4000-8000-00000000e006",
    kind: "refund",
    direction: "credit",
    amountMinor: 20_000_00,
    reference: "rm-refund-5d7f9b1c",
    status: "COMPLETED",
    createdAt: at(12, 11, 10),
    property: `${HOTEL.name}, ${HOTEL.city}`,
  },
];

export const BREAKDOWN: BalanceBreakdown = {
  availableMinor: BALANCE_MINOR,
  heldOutMinor: 0,
  heldInMinor: 0,
  outgoing: [],
  incoming: [],
  readFailed: false,
};

export const CARDS: PaymentMethod[] = [
  {
    id: "00000000-0000-4000-8000-00000000c001",
    cardType: "verve",
    last4: "4081",
    expMonth: 9,
    expYear: 2028,
    bank: null,
    reusable: true,
    isDefault: true,
    createdAt: at(30, 10, 0),
  },
];

export const ACCOUNTS: BankAccount[] = [
  {
    id: "00000000-0000-4000-8000-00000000b001",
    bankCode: "044",
    bankName: "Access Bank",
    accountNumber: "0123452210",
    accountName: "SEYI OMOJUNI",
    isDefault: true,
    createdAt: at(40, 10, 0),
  },
];
