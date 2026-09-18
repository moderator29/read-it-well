import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
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
/**
 * What a multi-bucket console can be narrowed by.
 *
 * ---------------------------------------------------------------------------
 * THE CONTRACT, AND WHY IT IS NOT THE QUEUE FRAME.
 *
 * Eleven console destinations are single-table queues and take
 * `AdminQueueFilter`: a search, a status chip row from that table's enum, a
 * date range and a cursor. The other nine are not queues. `/admin/money` is
 * three panels over two tables plus a set of totals, and it is not three
 * questions - it is ONE question, "what is happening with this person's money",
 * asked of everything the console can see at once.
 *
 * So the contract is: ONE SUBJECT, ONE CONTROL, EVERY PANEL APPLIES IT.
 *
 * WHY NOT PER-PANEL NARROWING, which is the obvious alternative. N filter rows
 * on one screen is N controls answering N questions, and the failure is silent:
 * an operator who types a name into the wallet panel and not into the ledger
 * panel gets a screen where half the answer is narrowed and half is not, and
 * nothing on it says which half. They will read the unnarrowed half as
 * complete. A filter that can lie about its own scope is worse than none.
 *
 * WHY NO STATUS CHIPS. Status means a different enum per panel here -
 * `wallet_entry_status` on two of them and nothing at all on the wallets - and
 * one chip row cannot be honest about that. Status belongs to a single-table
 * queue, where there is one enum to be right about.
 *
 * WHY NO PAGER. Three panels, three orderings, one cursor. Same reason the
 * two-bucket queues do not get one.
 *
 * THE ESCAPE HATCH, which this screen happens not to need. A panel whose table
 * cannot express the term must SAY so beside its heading rather than quietly
 * returning everything, because a panel showing all its rows under a filter is
 * indistinguishable from a panel with nothing filtered out. All three panels
 * here can express it, so nothing on this screen uses it; `/admin/standing` and
 * `/admin/moderation` will.
 *
 * WHAT `q` MEANS HERE: a person, a wallet, or a payment. One term, matched
 * against an owner's name, a wallet id and an entry reference, because those
 * are the three strings anybody asking about money on this platform has in
 * their hand.
 */
export type MoneyFilter = {
  q?: string;
  /** Lagos calendar days, inclusive, against `created_at` on both tables. */
  from?: string;
  to?: string;
};

/**
 * How many matched wallets can ride in the ledger's `or` filter.
 *
 * The entries panels match "this reference OR any entry belonging to a wallet
 * we matched", and that second half travels as a literal id list in the query
 * string. Capped so a search for a common first name cannot build a URL long
 * enough for the server to refuse, and stated rather than assumed away: past
 * this many matching wallets the ledger shows the reference matches and the
 * first fifty wallets' entries. The wallets panel itself is not capped.
 */
const LEDGER_WALLET_FANOUT = 50;

/**
 * A wallet id typed straight into the box.
 *
 * Kept local rather than imported from `bookings-queries.ts`, which has its own
 * copy: that file is a single-table queue with a different guard around it, and
 * a shared regex between two console modules is a shared dependency for four
 * lines of pattern. If a third module needs it, it moves to `queue-filter.ts`
 * with the rest of the filter vocabulary.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMoneyConsole(filter?: MoneyFilter): Promise<AdminRead<MoneyConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  /* Stripped of what PostgREST's `or` grammar reads as structure, for the same
     reason the other queues strip it: a comma would split one condition into
     two. */
  const term = (filter?.q ?? "").replace(/[,()*"\\]/g, "").trim();
  const looksLikeId = UUID_RE.test(term);

  try {
    /* Which wallets the term points at, resolved before anything else so all
       three panels agree about what "this person" means. */
    let walletIds: string[] | null = null;
    if (term.length > 0) {
      const { data: people } = await access.supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${term}%`)
        .limit(60);
      const ownerIds = (people ?? []).map((row) => row.id);
      const found = new Set<string>();
      if (looksLikeId) found.add(term);
      if (ownerIds.length > 0) {
        const { data: owned } = await access.supabase
          .from("wallets")
          .select("id")
          .in("user_id", ownerIds)
          .limit(WALLET_LIMIT);
        for (const row of owned ?? []) found.add(row.id);
      }
      walletIds = [...found];
    }

    let walletSelect = access.supabase
      .from("wallets")
      .select("id, user_id, currency, created_at");
    if (walletIds) walletSelect = walletSelect.in("id", walletIds);
    if (filter?.from) walletSelect = walletSelect.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) walletSelect = walletSelect.lte("created_at", lagosDayEnd(filter.to));

    let entrySelect = access.supabase
      .from("wallet_entries")
      .select("id, wallet_id, kind, direction, amount_minor, reference, status, metadata, created_at");
    if (term.length > 0) {
      /* The reference, or anything belonging to a wallet the term matched. */
      const clauses = [`reference.ilike.%${term}%`];
      const ids = (walletIds ?? []).slice(0, LEDGER_WALLET_FANOUT);
      if (ids.length > 0) clauses.push(`wallet_id.in.(${ids.join(",")})`);
      entrySelect = entrySelect.or(clauses.join(","));
    }
    if (filter?.from) entrySelect = entrySelect.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) entrySelect = entrySelect.lte("created_at", lagosDayEnd(filter.to));

    const [walletRes, entryRes] = await Promise.all([
      walletSelect.order("created_at", { ascending: false }).limit(WALLET_LIMIT),
      entrySelect.order("created_at", { ascending: false }).limit(500),
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

/**
 * How many rows a headline figure is summed over.
 *
 * Shared by the escrow desk and the examples console, because both draw tiles
 * that must not re-scope under a filter and both therefore read a second, thin
 * slice of their table to compute them. See the note on `getEscrowConsole`.
 */
export const SUMMARY_LIMIT = 2000;

/* ------------------------------------------------------------------ escrow */

export type EscrowView = {
  id: string;
  /*
   * The enum, not `string`. It came off a column typed `escrow_state` and was
   * widened to `string` on the way into this view, which meant the console's
   * chip map could not be checked against it: `/admin/escrow` renders
   * `STATE_LABEL[escrow.state] ?? escrow.state`, so the day a ninth state is
   * added an operator gets the raw column on the dispute desk. Keeping the
   * union here is what lets `ESCROW_STATE_WORDS` be exhaustive. F2-060.
   */
  state: Database["public"]["Enums"]["escrow_state"];
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
 * So the totals come from their own two-column read, and the list comes from
 * the narrowed one. That is a second round trip and it is worth it: the
 * previous single read was capped at 200 rows, so the totals were already
 * silently approximate the moment there were 201 escrows.
 *
 * IT IS A HIGHER CEILING RATHER THAN NO CEILING, and that is worth saying
 * plainly. `SUMMARY_LIMIT` rows are summed, so above that the figures become a
 * floor rather than a total, exactly as they were above 200 before. The honest
 * end state is a database-side aggregate - a view that sums by state - which is
 * a schema change and is written up as a recommendation rather than guessed at
 * here. Two thousand escrows is a long way from where this platform is, and the
 * bound is stated rather than assumed away.
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
    /*
     * THE TOTALS READ RUNS FIRST AND UNCONDITIONALLY, which is the whole point
     * of it being a separate read. An early return on "no listing matched that"
     * that also returned zeroed tiles would re-scope the headline figures under
     * a filter, which is exactly the fault this function is written to avoid,
     * and it would do it in the loudest possible way: "we are holding nothing".
     */
    const everything = await access.supabase
      .from("escrows")
      .select("state, amount_minor")
      .limit(SUMMARY_LIMIT);
    if (everything.error) return UNAVAILABLE;

    const all = everything.data ?? [];
    const totals = {
      /* Over EVERY escrow up to `SUMMARY_LIMIT`, never over the filtered page.
         Only HELD, RELEASE_REQUESTED and DISPUTED money is actually out of
         somebody's balance: an INITIATED escrow has moved nothing, and counting
         it would tell an operator the platform is holding money it is not. */
      heldMinor: all
        .filter((r) => ["HELD", "RELEASE_REQUESTED", "DISPUTED"].includes(r.state))
        .reduce((sum, r) => sum + r.amount_minor, 0),
      openCount: all.filter((r) =>
        ["INITIATED", "FUNDED", "HELD", "RELEASE_REQUESTED"].includes(r.state),
      ).length,
      disputeCount: all.filter((r) => r.state === "DISPUTED").length,
    };
    const emptyBoard = {
      state: "ok" as const,
      data: { disputes: [], open: [], settled: [], full: false, totals },
    };

    /*
     * THE SEARCH RESOLVES LISTING IDS FIRST, rather than filtering on the
     * embedded `listings.title`.
     *
     * Filtering an embedded resource needs PostgREST to treat the embed as an
     * inner join, which is a behaviour this codebase uses nowhere else and
     * which nobody here can run against a database to confirm. `getBookingBoard`
     * already answers the same question - "which rows point at a listing whose
     * title matches" - with two ordinary queries, and a proven shape beats a
     * clever one on a screen about money. An empty match short-circuits rather
     * than sending `in ()` to Postgres, and it keeps the tiles.
     */
    let listingMatches: string[] | null = null;
    if (term.length > 0) {
      const { data: matched, error: matchError } = await access.supabase
        .from("listings")
        .select("id")
        .ilike("title", `%${term}%`)
        .limit(60);
      if (matchError) return UNAVAILABLE;
      listingMatches = (matched ?? []).map((row) => row.id);
      if (listingMatches.length === 0) return emptyBoard;
    }

    let select = access.supabase.from("escrows").select(ESCROW_COLUMNS);
    if (listingMatches) select = select.in("listing_id", listingMatches);
    if (state) select = select.eq("state", state);
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));

    const { data, error } = await select
      .order("created_at", { ascending: false })
      .range(page.from, page.to);
    if (error) return UNAVAILABLE;

    const { rows, full } = takePage(data ?? []);
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

    return { state: "ok", data: { disputes, open, settled, full, totals } };
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

/* ---------------------------------------------------------- refund console */

/**
 * Where a refund's money actually is. Exported for its test.
 *
 * `booking_refunds` records the decision; the money is a wallet entry the
 * decision created, and the entry's own status is the only honest answer to
 * "has the guest got it". A refund of nothing (a cancellation inside the
 * schedule's last tier) is its own state rather than "failed", because
 * nothing was owed.
 */
export type RefundState = "credited" | "not_settled" | "failed" | "not_credited" | "nothing_owed";

export function refundState(
  refundMinor: number,
  entryStatus: Database["public"]["Enums"]["wallet_entry_status"] | null,
): RefundState {
  if (refundMinor <= 0) return "nothing_owed";
  if (entryStatus === null) return "not_credited";
  if (entryStatus === "COMPLETED") return "credited";
  if (entryStatus === "PENDING") return "not_settled";
  return "failed";
}

export type RefundView = {
  id: string;
  bookingId: string;
  guestId: string;
  guestName: string | null;
  listingTitle: string | null;
  paidMinor: number;
  refundMinor: number;
  retainedMinor: number;
  reason: string;
  note: string | null;
  reference: string | null;
  state: RefundState;
  decidedByName: string | null;
  createdAt: string;
};

export type RefundConsole = {
  rows: RefundView[];
  full: boolean;
  /** Over every refund on the platform up to `SUMMARY_LIMIT`, never the page. */
  totals: { refundedMinor: number; count: number; notCredited: number };
};

/**
 * Every refund decided on the console, newest first, with where its money is.
 *
 * Reads go through the service role after the guard, as the stays board
 * does, because `booking_refunds` publishes rows to the guest and the
 * decider and an operator asking "what has gone back this week" needs all of
 * them. The same `q` the rest of the money desk takes applies: a guest's
 * name, a booking id, or the refund's wallet reference.
 */
export async function getRefundConsole(filter?: AdminQueueFilter): Promise<AdminRead<RefundConsole>> {
  const access = await requireAdmin();
  if (access.state !== "admin") return UNAVAILABLE;

  let admin: SupabaseClient<Database>;
  try {
    admin = createAdminClient();
  } catch {
    return UNAVAILABLE;
  }

  const term = (filter?.q ?? "").replace(/[,()*"\\]/g, "").trim();
  const looksLikeId = UUID_RE.test(term);
  const page = pageRange(filter);

  try {
    const everything = await admin
      .from("booking_refunds")
      .select("refund_minor, wallet_entry_id")
      .limit(SUMMARY_LIMIT);
    if (everything.error) return UNAVAILABLE;
    const all = everything.data ?? [];
    const totalsBase = {
      refundedMinor: all.reduce((sum, r) => sum + r.refund_minor, 0),
      count: all.length,
      notCredited: all.filter((r) => r.refund_minor > 0 && r.wallet_entry_id === null).length,
    };

    let guestIds: string[] | null = null;
    if (term.length > 0 && !looksLikeId) {
      const { data: people, error } = await admin
        .from("profiles")
        .select("id")
        .ilike("display_name", `%${term}%`)
        .limit(60);
      if (error) return UNAVAILABLE;
      guestIds = (people ?? []).map((row) => row.id);
    }

    let select = admin
      .from("booking_refunds")
      .select(
        "id, booking_id, guest_id, paid_minor, refund_minor, retained_minor, reason, note, wallet_reference, wallet_entry_id, decided_by, created_at",
      );
    if (term.length > 0) {
      const clauses: string[] = [];
      if (looksLikeId) {
        clauses.push(`booking_id.eq.${term}`, `id.eq.${term}`);
      } else {
        clauses.push(`wallet_reference.ilike.%${term}%`);
        const ids = (guestIds ?? []).slice(0, LEDGER_WALLET_FANOUT);
        if (ids.length > 0) clauses.push(`guest_id.in.(${ids.join(",")})`);
      }
      select = select.or(clauses.join(","));
    }
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));

    const { data, error } = await select
      .order("created_at", { ascending: false })
      .range(page.from, page.to);
    if (error) return UNAVAILABLE;

    const { rows, full } = takePage(data ?? []);

    const entryIds = rows.map((r) => r.wallet_entry_id).filter((id): id is string => Boolean(id));
    const bookingIds = [...new Set(rows.map((r) => r.booking_id))];
    const [entriesRes, bookingsRes, names] = await Promise.all([
      entryIds.length > 0
        ? admin.from("wallet_entries").select("id, status").in("id", entryIds)
        : Promise.resolve({ data: [] as { id: string; status: Database["public"]["Enums"]["wallet_entry_status"] }[] }),
      bookingIds.length > 0
        ? admin.from("bookings").select("id, listing_id, listings ( title )").in("id", bookingIds)
        : Promise.resolve({ data: [] as { id: string; listing_id: string; listings: { title: string } | null }[] }),
      displayNames(
        admin,
        rows.flatMap((r) => [r.guest_id, r.decided_by ?? ""]),
      ),
    ]);

    const entryStatus = new Map<string, Database["public"]["Enums"]["wallet_entry_status"]>();
    for (const entry of entriesRes.data ?? []) entryStatus.set(entry.id, entry.status);
    const titles = new Map<string, string | null>();
    for (const booking of bookingsRes.data ?? []) {
      titles.set(booking.id, booking.listings?.title ?? null);
    }

    const views: RefundView[] = rows.map((r) => ({
      id: r.id,
      bookingId: r.booking_id,
      guestId: r.guest_id,
      guestName: names.get(r.guest_id) ?? null,
      listingTitle: titles.get(r.booking_id) ?? null,
      paidMinor: r.paid_minor,
      refundMinor: r.refund_minor,
      retainedMinor: r.retained_minor,
      reason: r.reason,
      note: r.note,
      reference: r.wallet_reference,
      state: refundState(
        r.refund_minor,
        r.wallet_entry_id ? (entryStatus.get(r.wallet_entry_id) ?? null) : null,
      ),
      decidedByName: r.decided_by ? (names.get(r.decided_by) ?? null) : null,
      createdAt: r.created_at,
    }));

    return { state: "ok", data: { rows: views, full, totals: totalsBase } };
  } catch {
    return UNAVAILABLE;
  }
}
