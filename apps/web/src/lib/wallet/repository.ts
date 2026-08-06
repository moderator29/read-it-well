import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import type { Database, Json } from "../supabase/database.types";
import type { ViewerWallet, WalletEntry, WalletSummary } from "./types";

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

const STATEMENT_LIMIT = 100;

/*
 * THERE IS NO SEEDED LEDGER HERE ANY MORE.
 *
 * This module used to carry nine invented wallet entries, a GTBank withdrawal
 * to an account ending 1294 among them, and a helper that summed them into a
 * balance. Nothing had imported either for some time, which is the only reason
 * a signed-out visitor stopped being shown somebody else's money.
 *
 * A wallet is the one screen where designed content cannot be labelled its way
 * out of trouble: a balance is a number about YOU, and a reference like
 * WD-GTB-0087-2201 is the kind of thing a person quotes to support. Both are
 * gone rather than merely unused, so neither can be imported back by accident.
 *
 * A wallet with no rows is an honest empty state and the screen already draws
 * one.
 */

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
 * What the wallet page shows this viewer.
 *
 * The real ledger when they are signed in, and nothing at all when they are
 * not. It used to hand a signed-out visitor a seeded wallet holding
 * **₦258,450.75 and a full day-grouped statement**, and the `live: false`
 * that marked it as invented reached `WalletDeck`, which used it to disable
 * withdraw and transfer, and never reached `BalanceCard`, which drew the
 * figure. So the one part of the page that could not act on the flag was the
 * part that stated the number.
 *
 * There is no labelled version of this. Every bank, and Stripe, Wise and Cash
 * App with them, answers a signed-out request for a balance with a sign-in
 * wall and never with a specimen figure, because a number beside a currency
 * symbol is read as a fact about the reader before any caption is. That is the
 * industry standard and this now follows it.
 *
 * Never throws; a read failure falls back to an empty wallet rather than
 * inventing money.
 */
export async function getWalletForViewer(): Promise<ViewerWallet> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return { id: null, balanceMinor: 0, currency: "NGN", entries: [], live: false };
  }
  try {
    const statement = await readStatement(session.supabase, session.user.id);
    return { ...statement, live: true };
  } catch {
    return { id: null, balanceMinor: 0, currency: "NGN", entries: [], live: true };
  }
}


