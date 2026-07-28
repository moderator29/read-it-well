import "server-only";
import type { WalletEntry, WalletRepository, WalletSummary } from "./types";

/**
 * Wallet data access.
 *
 * Selected by NF_DATA_SOURCE, same contract as the listing and agent
 * repositories. The seed repository serves a coherent ledger: every amount is
 * integer kobo, every timestamp is in the past, and the balance is never
 * stored anywhere. It is derived below by summing COMPLETED entries with
 * integer arithmetic, exactly the way the database view derives it (Master
 * Rules 8 and 50), so the figure on screen and the rows beneath it can never
 * disagree.
 *
 * The real repository reads public.wallet_balances and wallet_entries under
 * Row Level Security for the signed-in user, and creates the wallet row
 * lazily through the service role on first money movement, matching the
 * migration's documented lazy-creation contract.
 */

const HOUR_MS = 3_600_000;

/** An ISO timestamp `daysBack` days and `hoursBack` hours before now. */
function at(daysBack: number, hoursBack = 0): string {
  return new Date(Date.now() - (daysBack * 24 + hoursBack) * HOUR_MS).toISOString();
}

/** Newest first, matching the WalletSummary contract. All amounts integer kobo. */
function seedEntries(): WalletEntry[] {
  return [
    {
      id: "wal-entry-09",
      kind: "withdrawal",
      direction: "debit",
      amountMinor: 5_000_000, // ₦50,000.00
      reference: "WD-GTB-0087-2201",
      status: "PENDING",
      createdAt: at(0, 2),
      note: "Withdrawal to GTBank ****1294",
    },
    {
      id: "wal-entry-08",
      kind: "deposit",
      direction: "credit",
      amountMinor: 1_000_000, // ₦10,000.00
      reference: "ZEN-TRF-8841-XK",
      status: "COMPLETED",
      createdAt: at(1, 4),
      note: "Zenith Bank transfer",
    },
    {
      id: "wal-entry-07",
      kind: "transfer_in",
      direction: "credit",
      amountMinor: 3_000_000, // ₦30,000.00
      reference: "NF-TRF-IN-55201",
      status: "COMPLETED",
      createdAt: at(3, 6),
      note: "Transfer from Adewale B.",
    },
    {
      id: "wal-entry-06",
      kind: "payment",
      direction: "debit",
      amountMinor: 6_355_000, // ₦63,550.00
      reference: "BK-VI-20418",
      status: "COMPLETED",
      createdAt: at(6, 3),
      note: "Booking payment, Victoria Island suite",
    },
    {
      id: "wal-entry-05",
      kind: "refund",
      direction: "credit",
      amountMinor: 4_200_075, // ₦42,000.75
      reference: "RF-IKJ-77031",
      status: "COMPLETED",
      createdAt: at(8, 5),
      note: "Refund, Ikeja studio cancellation",
    },
    {
      id: "wal-entry-04",
      kind: "transfer_out",
      direction: "debit",
      amountMinor: 2_500_000, // ₦25,000.00
      reference: "NF-TRF-OUT-41977",
      status: "COMPLETED",
      createdAt: at(10, 2),
      note: "Transfer to Chidinma O.",
    },
    {
      id: "wal-entry-03",
      kind: "deposit",
      direction: "credit",
      amountMinor: 20_000_000, // ₦200,000.00
      reference: "PSK-CARD-9F2K7Q",
      status: "COMPLETED",
      createdAt: at(12, 7),
      note: "Paystack card funding",
    },
    {
      id: "wal-entry-02",
      kind: "payment",
      direction: "debit",
      amountMinor: 8_500_000, // ₦85,000.00
      reference: "BK-LKK-19834",
      status: "COMPLETED",
      createdAt: at(14, 4),
      note: "Booking payment, Lekki 2BR",
    },
    {
      id: "wal-entry-01",
      kind: "deposit",
      direction: "credit",
      amountMinor: 15_000_000, // ₦150,000.00
      reference: "GTB-TRF-4402-AA",
      status: "COMPLETED",
      createdAt: at(16, 6),
      note: "GTBank transfer",
    },
  ];
}

/** sum(credits) - sum(debits) over COMPLETED entries only. Integer kobo. */
function deriveBalanceMinor(entries: WalletEntry[]): number {
  let balance = 0;
  for (const e of entries) {
    if (e.status !== "COMPLETED") continue;
    balance += e.direction === "credit" ? e.amountMinor : -e.amountMinor;
  }
  return balance;
}

class SeedWalletRepository implements WalletRepository {
  readonly isSeed = true;
  async getWallet(): Promise<WalletSummary> {
    const entries = seedEntries();
    return {
      id: "wal-0001",
      // 25_845_075 kobo, i.e. ₦258,450.75, derived rather than asserted.
      balanceMinor: deriveBalanceMinor(entries),
      currency: "NGN",
      entries,
    };
  }
}

class ApiWalletRepository implements WalletRepository {
  readonly isSeed = false;
  async getWallet(): Promise<WalletSummary> {
    throw new Error("NF_DATA_SOURCE=api but the wallet API is not implemented yet.");
  }
}

export function getWalletRepository(): WalletRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiWalletRepository()
    : new SeedWalletRepository();
}
