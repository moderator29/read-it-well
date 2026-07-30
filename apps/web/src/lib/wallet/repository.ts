import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import type { Database, Json } from "../supabase/database.types";
import type { ViewerWallet, WalletEntry, WalletRepository, WalletSummary } from "./types";

/**
 * Wallet data access.
 *
 * Two sources, one contract. When Supabase is configured and the viewer is
 * signed in, the wallet is the real thing: the derived balance from the
 * public.wallet_balances view and the newest hundred ledger entries, both
 * read under Row Level Security as the user. When the platform is
 * unconfigured or the viewer is signed out, the seed ledger below stands in,
 * with its balance derived by the same integer arithmetic as the database
 * view (Master Rules 8 and 50), so the figure on screen and the rows beneath
 * it can never disagree in either mode.
 */

const HOUR_MS = 3_600_000;
const STATEMENT_LIMIT = 100;

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

function seedWallet(): WalletSummary {
  const entries = seedEntries();
  return {
    id: "wal-0001",
    // 25_845_075 kobo, i.e. ₦258,450.75, derived rather than asserted.
    balanceMinor: deriveBalanceMinor(entries),
    currency: "NGN",
    entries,
  };
}

/** The display note a ledger row was written with, when metadata carries one. */
function noteFrom(metadata: Json): string | undefined {
  if (metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)) {
    const note = (metadata as Record<string, Json>)["note"];
    if (typeof note === "string" && note.trim().length > 0) return note;
  }
  return undefined;
}

type EntryRow = Database["public"]["Tables"]["wallet_entries"]["Row"];

function toWalletEntry(row: EntryRow): WalletEntry {
  const note = noteFrom(row.metadata);
  return {
    id: row.id,
    kind: row.kind,
    direction: row.direction,
    amountMinor: row.amount_minor,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    ...(note ? { note } : {}),
  };
}

/**
 * The signed-in user's real statement under RLS: the derived balance from
 * wallet_balances and the newest entries. A user whose wallet has never been
 * created simply has a zero balance and no history; that is the lazy-creation
 * contract, not an error.
 */
export async function readStatement(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<WalletSummary> {
  const balanceRead = await supabase
    .from("wallet_balances")
    .select("wallet_id, balance_minor, currency")
    .eq("user_id", userId)
    .maybeSingle();
  if (balanceRead.error) throw new Error(balanceRead.error.message);

  const wallet = balanceRead.data;
  if (!wallet || !wallet.wallet_id) {
    return { id: null, balanceMinor: 0, currency: "NGN", entries: [] };
  }

  const entriesRead = await supabase
    .from("wallet_entries")
    .select("*")
    .eq("wallet_id", wallet.wallet_id)
    .order("created_at", { ascending: false })
    .limit(STATEMENT_LIMIT);
  if (entriesRead.error) throw new Error(entriesRead.error.message);

  return {
    id: wallet.wallet_id,
    balanceMinor: wallet.balance_minor ?? 0,
    currency: wallet.currency ?? "NGN",
    entries: (entriesRead.data ?? []).map(toWalletEntry),
  };
}

/**
 * What the wallet page shows this viewer: the real ledger when configured and
 * signed in, the seed ledger otherwise. Never throws; a read failure falls
 * back to an empty live wallet rather than inventing money.
 */
export async function getWalletForViewer(): Promise<ViewerWallet> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return { ...seedWallet(), live: false };
  }
  try {
    const statement = await readStatement(session.supabase, session.user.id);
    return { ...statement, live: true };
  } catch {
    return { id: null, balanceMinor: 0, currency: "NGN", entries: [], live: true };
  }
}

class SeedWalletRepository implements WalletRepository {
  readonly isSeed = true;
  async getWallet(): Promise<WalletSummary> {
    return seedWallet();
  }
}

export function getWalletRepository(): WalletRepository {
  return new SeedWalletRepository();
}
