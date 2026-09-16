import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { Constants, type Database } from "../supabase/database.types";
import { requireAdmin } from "./guard";
import {
  lagosDayEnd,
  lagosDayStart,
  pageRange,
  pickStatus,
  takePage,
  type AdminQueueFilter,
} from "./queue-filter";

/**
 * The money console's reads: wallets, the ledger, escrow, and what we charge.
 *
 * The console has fourteen sections and not one of them was about money. There
 * was no way to see a wallet, no way to see a ledger entry, no way to find a
 * withdrawal stuck PENDING, and no way to look at an escrow at all. An operator
 * asked "where is my money" by a user had nothing to open, which meant the only
 * answer available to support was to guess or to ask an engineer to run SQL
 * against production. That is the failure this file exists to end.
 *
 * EVERY READ GOES THROUGH THE ADMIN'S OWN RLS-BOUND CLIENT, never the service
 * role. `wallets_select_admin`, `wallet_entries_select_admin` and
 * `escrows_select_admin` already publish these rows to the two admin roles, so
 * the database is the authority on who may see them and this file never has to
 * repeat a policy. It also means an operator whose role was revoked five
 * minutes ago sees nothing, which a service-role read would not give us.
 *
 * Money is integer kobo throughout. Nothing here divides by a hundred; the
 * formatter at the edge does that once.
 */

/** Every read answers one of these, so a page never renders a fake empty state. */
export type AdminRead<T> = { state: "ok"; data: T } | { state: "unavailable" };

const UNAVAILABLE = { state: "unavailable" } as const;

/* ------------------------------------------------------------- the ledger */

export type WalletEntryView = {
  id: string;
  walletId: string;
  ownerName: string | null;
  kind: string;
  direction: "credit" | "debit";
  amountMinor: number;
  reference: string;
  status: string;
  note: string | null;
  createdAt: string;
};

export type WalletView = {
  id: string;
  userId: string;
  ownerName: string | null;
  currency: string;
  /** Settled credits minus settled debits. The number the person sees. */
  balanceMinor: number;
  /** Debits sitting PENDING: money promised away and not yet gone. */
  heldMinor: number;
  entryCount: number;
  createdAt: string;
};

export type MoneyConsole = {
  wallets: WalletView[];
  recent: WalletEntryView[];
  /** PENDING debits older than the sweeper's window. Somebody is waiting. */
  stuck: WalletEntryView[];
  totals: { balanceMinor: number; heldMinor: number; walletCount: number };
};

/** Older than this and a PENDING debit is not in flight, it is stuck. */
const STUCK_AFTER_MINUTES = 30;

const RECENT_LIMIT = 60;
const WALLET_LIMIT = 40;

function noteOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const note = (metadata as Record<string, unknown>)["note"];
    if (typeof note === "string" && note.trim().length > 0) return note;
  }
  return null;
}

/**
 * Wallets, the newest ledger entries, and anything stuck.
 *
 * Balances are summed in this process rather than read from wallet_balances,
 * because the console needs the HELD figure beside the settled one and the view
 * carries only the settled half. Two numbers from one pass over the entries the
 * page is already loading beats a second round trip for a view that answers
 * half the question.
 */
export async function getMoneyConsole(): Promise<AdminRead<MoneyConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const [walletRes, entryRes] = await Promise.all([
      access.supabase
        .from("wallets")
        .select("id, user_id, currency, created_at")
        .order("created_at", { ascending: false })
        .limit(WALLET_LIMIT),
      access.supabase
        .from("wallet_entries")
        .select("id, wallet_id, kind, direction, amount_minor, reference, status, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (walletRes.error || entryRes.error) return UNAVAILABLE;

    const wallets = walletRes.data ?? [];
    const entries = entryRes.data ?? [];

    const names = await displayNames(
      access.supabase,
      wallets.map((w) => w.user_id),
    );
    const ownerByWallet = new Map(wallets.map((w) => [w.id, w.user_id]));

    const settled = new Map<string, number>();
    const held = new Map<string, number>();
    const counted = new Map<string, number>();
    for (const entry of entries) {
      counted.set(entry.wallet_id, (counted.get(entry.wallet_id) ?? 0) + 1);
      if (entry.status === "COMPLETED") {
        const signed = entry.direction === "credit" ? entry.amount_minor : -entry.amount_minor;
        settled.set(entry.wallet_id, (settled.get(entry.wallet_id) ?? 0) + signed);
      } else if (entry.status === "PENDING" && entry.direction === "debit") {
        held.set(entry.wallet_id, (held.get(entry.wallet_id) ?? 0) + entry.amount_minor);
      }
    }

    const toEntryView = (row: (typeof entries)[number]): WalletEntryView => {
      const owner = ownerByWallet.get(row.wallet_id);
      return {
        id: row.id,
        walletId: row.wallet_id,
        ownerName: owner ? (names.get(owner) ?? null) : null,
        kind: row.kind,
        direction: row.direction,
        amountMinor: row.amount_minor,
        reference: row.reference,
        status: row.status,
        note: noteOf(row.metadata),
        createdAt: row.created_at,
      };
    };

    const stuckBefore = Date.now() - STUCK_AFTER_MINUTES * 60_000;

    const walletViews: WalletView[] = wallets.map((w) => ({
      id: w.id,
      userId: w.user_id,
      ownerName: names.get(w.user_id) ?? null,
      currency: w.currency,
      balanceMinor: settled.get(w.id) ?? 0,
      heldMinor: held.get(w.id) ?? 0,
      entryCount: counted.get(w.id) ?? 0,
      createdAt: w.created_at,
    }));

    return {
      state: "ok",
      data: {
        wallets: walletViews,
        recent: entries.slice(0, RECENT_LIMIT).map(toEntryView),
        stuck: entries
          .filter(
            (e) =>
              e.status === "PENDING" &&
              e.direction === "debit" &&
              Date.parse(e.created_at) < stuckBefore,
          )
          .map(toEntryView),
        totals: {
          balanceMinor: walletViews.reduce((sum, w) => sum + w.balanceMinor, 0),
          heldMinor: walletViews.reduce((sum, w) => sum + w.heldMinor, 0),
          walletCount: walletViews.length,
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------------ escrow */

export type EscrowView = {
  id: string;
  state: string;
  purpose: string;
  amountMinor: number;
  commissionMinor: number | null;
  payerName: string | null;
  payeeName: string | null;
  listingTitle: string | null;
  payerConfirmed: boolean;
  payeeConfirmed: boolean;
  /** True when the payer's half came from a confirmed inspection. */
  fromInspection: boolean;
  disputeReason: string | null;
  resolutionNote: string | null;
  autoReleaseAt: string | null;
  createdAt: string;
  heldAt: string | null;
  settledAt: string | null;
};

export type EscrowConsole = {
  /** Somebody objected. This queue is the one that must never sit unread. */
  disputes: EscrowView[];
  /** Money the platform is holding right now. */
  open: EscrowView[];
  /** Recently settled, so an operator can answer "where did it go". */
  settled: EscrowView[];
  /** True when the narrowed read came back with a whole page, so there is more. */
  full: boolean;
  /** Over every escrow on the platform, never over the filtered page. */
  totals: { heldMinor: number; openCount: number; disputeCount: number };
};

const ESCROW_COLUMNS =
  "id, state, purpose, amount_minor, commission_minor, payer_id, payee_id, listing_id, payer_confirmed_at, payee_confirmed_at, inspection_confirmation_id, dispute_reason, resolution_note, auto_release_at, created_at, held_at, released_at, refunded_at, resolved_at, listings ( title )";

/**
 * The escrow desk, narrowed by the console's shared queue frame.
 *
 * ---------------------------------------------------------------------------
 * THE TOTALS ARE READ SEPARATELY, AND THAT IS THE WHOLE CARE IN THIS FUNCTION.
 *
 * "Money held" is a headline figure on a money screen. Computing it from the
 * same rows the list is built from would make it the total of whatever the
 * operator happened to have filtered to, so choosing the DISPUTED chip would
 * silently redraw "we are holding X" as "we are holding X in disputes" with
 * nothing on screen saying the number had changed meaning. A stat tile that
 * quietly re-scopes itself under a filter is worse than no tile.
 *
 * So the totals come from their own two-column read of every escrow, and the
 * list comes from the narrowed one. That is a second round trip and it is worth
 * it: the previous single read was capped at 200 rows, so the totals were
 * already silently approximate the moment there were 201 escrows, and this
 * fixes that at the same time.
 */
export async function getEscrowConsole(
  filter?: AdminQueueFilter,
): Promise<AdminRead<EscrowConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  const term = (filter?.q ?? "").trim();
  const state = pickStatus(Constants.public.Enums.escrow_state, filter?.status);
  const page = pageRange(filter);

  try {
    let select = access.supabase.from("escrows").select(ESCROW_COLUMNS);
    /* The listing's title, through the embedded relation, because "the Lekki
       flat" is how an operator remembers an escrow. Not the id: an id is how
       you find a row you already have. */
    if (term.length > 0) select = select.ilike("listings.title", `%${term}%`).not("listings", "is", null);
    if (state) select = select.eq("state", state);
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));

    const [listed, everything] = await Promise.all([
      select.order("created_at", { ascending: false }).range(page.from, page.to),
      access.supabase.from("escrows").select("state, amount_minor"),
    ]);
    const { data, error } = listed;
    if (error || everything.error) return UNAVAILABLE;

    const { rows: data_, full } = takePage(data ?? []);
    const rows = data_;
    const names = await displayNames(
      access.supabase,
      rows.flatMap((r) => [r.payer_id, r.payee_id]),
    );

    const toView = (row: (typeof rows)[number]): EscrowView => ({
      id: row.id,
      state: row.state,
      purpose: row.purpose,
      amountMinor: row.amount_minor,
      commissionMinor: row.commission_minor,
      payerName: names.get(row.payer_id) ?? null,
      payeeName: names.get(row.payee_id) ?? null,
      listingTitle: row.listings?.title ?? null,
      payerConfirmed: row.payer_confirmed_at !== null,
      payeeConfirmed: row.payee_confirmed_at !== null,
      fromInspection: row.inspection_confirmation_id !== null,
      disputeReason: row.dispute_reason,
      resolutionNote: row.resolution_note,
      autoReleaseAt: row.auto_release_at,
      createdAt: row.created_at,
      heldAt: row.held_at,
      settledAt: row.released_at ?? row.refunded_at ?? row.resolved_at,
    });

    const views = rows.map(toView);
    const disputes = views.filter((v) => v.state === "DISPUTED");
    const open = views.filter((v) =>
      ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED"].includes(v.state),
    );
    /* No longer `.slice(0, 25)`. The page the operator asked for is the page
       they get; a second cap inside a paged read is a row that exists, was
       fetched, and is then dropped on the floor with no Next link to reach it. */
    const settled = views.filter((v) => ["RELEASED", "REFUNDED", "RESOLVED"].includes(v.state));

    const all = everything.data ?? [];
    return {
      state: "ok",
      data: {
        disputes,
        open,
        settled,
        full,
        totals: {
          /* Over EVERY escrow, not over the filtered page. See the note above
             this function. Only HELD, RELEASE_REQUESTED and DISPUTED money is
             actually out of somebody's balance: an INITIATED escrow has moved
             nothing, and counting it would tell an operator the platform is
             holding money it is not. */
          heldMinor: all
            .filter((r) => ["HELD", "RELEASE_REQUESTED", "DISPUTED"].includes(r.state))
            .reduce((sum, r) => sum + r.amount_minor, 0),
          openCount: all.filter((r) =>
            ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED"].includes(r.state),
          ).length,
          disputeCount: all.filter((r) => r.state === "DISPUTED").length,
        },
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* -------------------------------------------------------------- fee rates */

export type FeeRateView = {
  id: string;
  kind: "commission" | "listing_fee";
  basisPoints: number;
  flatMinor: number;
  effectiveFrom: string;
  note: string | null;
  setByName: string | null;
  /** True for the row currently deciding what gets charged. */
  inForce: boolean;
  /** True for a rate dated ahead of now, announced and not yet biting. */
  scheduled: boolean;
};

export type FeeConsole = {
  commission: FeeRateView[];
  listingFee: FeeRateView[];
};

export async function getFeeConsole(): Promise<AdminRead<FeeConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  try {
    const { data, error } = await access.supabase
      .from("fee_rates")
      .select("id, kind, basis_points, flat_minor, effective_from, note, created_by")
      .order("effective_from", { ascending: false })
      .limit(100);
    if (error) return UNAVAILABLE;

    const rows = data ?? [];
    const names = await displayNames(
      access.supabase,
      rows.map((r) => r.created_by).filter((id): id is string => Boolean(id)),
    );

    const now = Date.now();
    const byKind = (kind: "commission" | "listing_fee"): FeeRateView[] => {
      const of = rows.filter((r) => r.kind === kind);
      /* The one in force is the newest row not in the future. Computed here the
         same way public.fee_rate_at computes it, because a console that
         disagreed with the function about which rate is live would be worse
         than no console. */
      const live = of.find((r) => Date.parse(r.effective_from) <= now);
      return of.map((r) => ({
        id: r.id,
        kind,
        basisPoints: r.basis_points,
        flatMinor: r.flat_minor,
        effectiveFrom: r.effective_from,
        note: r.note,
        setByName: r.created_by ? (names.get(r.created_by) ?? null) : null,
        inForce: live !== undefined && live.id === r.id,
        scheduled: Date.parse(r.effective_from) > now,
      }));
    };

    return {
      state: "ok",
      data: { commission: byKind("commission"), listingFee: byKind("listing_fee") },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------------ shared */

/**
 * Names for a set of user ids, in one query.
 *
 * profiles carries no email, by design, so a display name is the most a console
 * can show without touching the auth admin API. A person with no display name
 * comes back absent rather than as "Unknown", and the page prints the id, which
 * is what an operator actually needs to search on.
 */
async function displayNames(
  supabase: SupabaseClient<Database>,
  ids: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", unique);
  for (const row of data ?? []) {
    if (row.display_name) out.set(row.id, row.display_name);
  }
  return out;
}
