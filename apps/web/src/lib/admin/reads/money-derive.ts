import type {
  EscrowActivity,
  EscrowPipeline,
  EscrowState,
  LedgerPage,
  MoneyFlow,
  ReconciliationHealth,
  RentChargeRow,
  RentCharges,
  RentChargeState,
} from "./money-types";

/**
 * THE MONEY DESKS' ARITHMETIC, PURE.
 *
 * Every function here takes rows and returns figures, and is only ever handed
 * EVERY row of its table (`readEvery` in `lib/admin/reads/money.ts` pages through the
 * whole table and checks the count). Deriving a total from a capped list is
 * the one thing the founder ruled out, so nothing here is ever given one.
 *
 * No clock is read in here. `now` is handed in, so every branch is testable at
 * a fixed instant (`derive.test.ts`).
 */

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/** The slice of a wallet entry every derivation below needs. */
export type EntryLike = {
  id: string;
  direction: "credit" | "debit";
  amountMinor: number;
  status: string;
  kind: string;
  createdAt: string;
};

function signed(entry: EntryLike): number {
  if (entry.status !== "COMPLETED") return 0;
  return entry.direction === "credit" ? entry.amountMinor : -entry.amountMinor;
}

/* ----------------------------------------------------------- the float */

/** Settled credits minus settled debits over the entries created before `before`. */
export function floatAt(entries: readonly EntryLike[], before: number): number {
  let sum = 0;
  for (const entry of entries) {
    if (Date.parse(entry.createdAt) < before) sum += signed(entry);
  }
  return sum;
}

/** Value of COMPLETED entries, both directions, in [from, to). */
export function settledBetween(entries: readonly EntryLike[], from: number, to: number): number {
  let sum = 0;
  for (const entry of entries) {
    const at = Date.parse(entry.createdAt);
    if (entry.status === "COMPLETED" && at >= from && at < to) sum += entry.amountMinor;
  }
  return sum;
}

export type WholePulse = {
  floatMinor: number;
  floatWeekAgoMinor: number;
  settledMinor: { thisWeek: number; lastWeek: number };
  /** Whether any entry exists older than a week, so "a week ago" was a real period. */
  hasLastWeek: boolean;
};

export function pulseFromWhole(entries: readonly EntryLike[], now: number): WholePulse {
  const weekAgo = now - WEEK_MS;
  return {
    floatMinor: floatAt(entries, Number.POSITIVE_INFINITY),
    floatWeekAgoMinor: floatAt(entries, weekAgo),
    settledMinor: {
      thisWeek: settledBetween(entries, weekAgo, now + 1),
      lastWeek: settledBetween(entries, now - 2 * WEEK_MS, weekAgo),
    },
    hasLastWeek: entries.some((entry) => Date.parse(entry.createdAt) < weekAgo),
  };
}

/**
 * The change between two real periods, as a whole percentage, or null.
 *
 * Null whenever the earlier period is zero or absent: a percentage of nothing
 * is not a number, and drawing "+100%" for a first week would be an invented
 * trend dressed as arithmetic.
 */
export function percentChange(now: number, before: number | null): number | null {
  if (before === null || before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

/* ------------------------------------------------------------ the flow */

/** `YYYY-MM` in Lagos. Lagos is UTC+1 all year, no daylight saving. */
export function lagosMonth(iso: string | number): string {
  const at = typeof iso === "number" ? iso : Date.parse(iso);
  const d = new Date(at + 3_600_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * Settled money in and out per Lagos month, from the first month that has an
 * entry to the month of `now`, zero months included, at most `months` long.
 *
 * The series STARTS at the first entry rather than twelve months back,
 * because the months before the platform moved money were not quiet months,
 * they did not exist, and drawing them as zeros would draw a history.
 */
export function flowFromWhole(
  entries: readonly EntryLike[],
  now: number,
  months = 12,
): MoneyFlow {
  const settled = entries.filter((entry) => entry.status === "COMPLETED");
  const first = settled.reduce<number | null>((min, entry) => {
    const at = Date.parse(entry.createdAt);
    return min === null || at < min ? at : min;
  }, null);

  const since30 = now - 30 * DAY_MS;
  const last30Days = { inMinor: 0, outMinor: 0 };
  for (const entry of settled) {
    if (Date.parse(entry.createdAt) >= since30) {
      if (entry.direction === "credit") last30Days.inMinor += entry.amountMinor;
      else last30Days.outMinor += entry.amountMinor;
    }
  }

  if (first === null) return { months: [], last30Days, firstEntryAt: null };

  const end = lagosMonth(now);
  const buckets = new Map<string, { inMinor: number; outMinor: number }>();
  let cursor = lagosMonth(first);
  while (cursor <= end) {
    buckets.set(cursor, { inMinor: 0, outMinor: 0 });
    cursor = nextMonth(cursor);
  }
  for (const entry of settled) {
    const bucket = buckets.get(lagosMonth(entry.createdAt));
    if (!bucket) continue;
    if (entry.direction === "credit") bucket.inMinor += entry.amountMinor;
    else bucket.outMinor += entry.amountMinor;
  }
  const all = [...buckets.entries()].map(([month, v]) => ({ month, ...v }));
  return {
    months: all.slice(Math.max(0, all.length - months)),
    last30Days,
    firstEntryAt: new Date(first).toISOString(),
  };
}

/* ---------------------------------------------------------- the ledger */

/**
 * One page of the ledger with the platform float after each entry.
 *
 * Entries arrive newest first. The float after the newest entry is the float
 * now; walking back, the float after an older entry is the float after the
 * one above it minus what the one above it moved. PENDING, FAILED and
 * REVERSED entries move nothing, so the balance beside them repeats, which is
 * exactly what an operator reconciling by eye needs to see.
 */
export function ledgerFromWhole<T extends EntryLike & { reference: string; note: string | null; ownerName: string | null }>(
  newestFirst: readonly T[],
  page: number,
  pageSize: number,
): LedgerPage {
  const total = newestFirst.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);

  let balance = floatAt(newestFirst, Number.POSITIVE_INFINITY);
  const balances: number[] = [];
  for (const entry of newestFirst) {
    balances.push(balance);
    balance -= signed(entry);
  }

  const start = (current - 1) * pageSize;
  return {
    rows: newestFirst.slice(start, start + pageSize).map((entry, i) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      kind: entry.kind,
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      status: entry.status,
      reference: entry.reference,
      note: entry.note,
      ownerName: entry.ownerName,
      balanceAfterMinor: balances[start + i] ?? null,
    })),
    total,
    page: current,
    pageSize,
  };
}

/* ----------------------------------------------------------- the pager */

export type PagerItem = { kind: "page"; page: number } | { kind: "gap"; key: string };

/**
 * The numbered pager the renders draw: 1 2 3 4 5 ... 12.
 *
 * First and last always, a window of five around the current page, and a gap
 * wherever pages are skipped. Seven or fewer pages print every number.
 */
export function pagerItems(current: number, pages: number): PagerItem[] {
  if (pages <= 1) return [];
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => ({ kind: "page", page: i + 1 }));
  const start = Math.max(1, Math.min(current - 2, pages - 5));
  const end = Math.min(pages, start + 4);
  const items: PagerItem[] = [];
  if (start > 1) {
    items.push({ kind: "page", page: 1 });
    if (start > 2) items.push({ kind: "gap", key: "gap-start" });
  }
  for (let p = start; p <= end; p += 1) items.push({ kind: "page", page: p });
  if (end < pages) {
    if (end < pages - 1) items.push({ kind: "gap", key: "gap-end" });
    items.push({ kind: "page", page: pages });
  }
  return items;
}

/** A `?page=` value read defensively: anything that is not a positive whole number is page 1. */
export function readPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/* ------------------------------------------------------------- escrow */

/** Whole days between two instants, never negative. */
export function wholeDays(fromIso: string | null, now: number): number | null {
  if (!fromIso) return null;
  const at = Date.parse(fromIso);
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now - at) / DAY_MS));
}

/**
 * Time left until an automatic release, in the renders' "4d 12h" shape.
 *
 * "due" once the moment has passed: the sweeper releases on its own schedule,
 * so a past deadline is money about to move, not money late.
 */
export function countdown(untilIso: string | null, now: number): { label: string; due: boolean } | null {
  if (!untilIso) return null;
  const at = Date.parse(untilIso);
  if (Number.isNaN(at)) return null;
  const left = at - now;
  if (left <= 0) return { label: "due", due: true };
  const days = Math.floor(left / DAY_MS);
  const hours = Math.floor((left % DAY_MS) / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  if (days > 0) return { label: `${days}d ${hours}h`, due: false };
  if (hours > 0) return { label: `${hours}h ${minutes}m`, due: false };
  return { label: `${Math.max(1, minutes)}m`, due: false };
}

/**
 * Every escrow state and purpose in the LIVE schema (read 23 September),
 * which is ahead of the generated types by `CANCELLED` and `agency_fee`. A
 * value outside these lists still counts: the pipeline adds it as it meets it.
 */
export const ESCROW_STATES: readonly string[] = [
  "INITIATED",
  "FUNDED",
  "HELD",
  "RELEASE_REQUESTED",
  "RELEASED",
  "REFUNDED",
  "DISPUTED",
  "RESOLVED",
  "CANCELLED",
];

export const ESCROW_PURPOSES: readonly string[] = [
  "rent_deposit",
  "first_rent",
  "purchase_deposit",
  "purchase_balance",
  "agency_fee",
];

/** The slice of `EscrowView` the pipeline needs. */
export type EscrowLike = {
  id: string;
  state: EscrowState | string;
  purpose: string;
  amountMinor: number;
  listingTitle: string | null;
  createdAt: string;
  heldAt: string | null;
  settledAt: string | null;
  /* The remaining transitions, when the read carries them (`lib/admin/reads/escrow.ts`
     does). Absent, the activity list uses the three above and invents none. */
  fundedAt?: string | null;
  releaseRequestedAt?: string | null;
  releasedAt?: string | null;
  refundedAt?: string | null;
  disputedAt?: string | null;
  resolvedAt?: string | null;
};

/**
 * The pipeline from every escrow on the platform, when the caller has proved
 * it holds every one (an unfiltered `getEscrowConsole()` page that came back
 * short of full).
 *
 * The activity list uses the three timestamps `EscrowView` carries: opened,
 * held and settled. Funding, release requests and disputes have their own
 * columns in the table but not in `EscrowView`; until it carries them they
 * are not invented from the state.
 */
export function pipelineFromWhole(escrows: readonly EscrowLike[], recentCount = 6): EscrowPipeline {
  const byState = Object.fromEntries(
    ESCROW_STATES.map((s) => [s, { count: 0, amountMinor: 0 }]),
  ) as EscrowPipeline["byState"];
  const byPurpose = Object.fromEntries(
    ESCROW_PURPOSES.map((p) => [p, { count: 0, amountMinor: 0 }]),
  ) as EscrowPipeline["byPurpose"];

  const events: EscrowActivity[] = [];
  for (const e of escrows) {
    const st = (byState[e.state] ??= { count: 0, amountMinor: 0 });
    st.count += 1;
    st.amountMinor += e.amountMinor;
    const purpose = (byPurpose[e.purpose] ??= { count: 0, amountMinor: 0 });
    purpose.count += 1;
    purpose.amountMinor += e.amountMinor;
    const base = { escrowId: e.id, amountMinor: e.amountMinor, listingTitle: e.listingTitle };
    events.push({ ...base, event: "opened", at: e.createdAt });
    if (e.heldAt) events.push({ ...base, event: "held", at: e.heldAt });
    const detailed =
      e.fundedAt !== undefined ||
      e.releasedAt !== undefined ||
      e.refundedAt !== undefined ||
      e.disputedAt !== undefined;
    if (detailed) {
      if (e.fundedAt) events.push({ ...base, event: "funded", at: e.fundedAt });
      if (e.releaseRequestedAt) events.push({ ...base, event: "release_requested", at: e.releaseRequestedAt });
      if (e.disputedAt) events.push({ ...base, event: "disputed", at: e.disputedAt });
      if (e.releasedAt) events.push({ ...base, event: "released", at: e.releasedAt });
      if (e.refundedAt) events.push({ ...base, event: "refunded", at: e.refundedAt });
      if (e.resolvedAt) events.push({ ...base, event: "resolved", at: e.resolvedAt });
    } else if (e.settledAt) {
      const event =
        e.state === "REFUNDED" ? "refunded" : e.state === "RESOLVED" ? "resolved" : "released";
      events.push({ ...base, event, at: e.settledAt });
    }
  }
  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  return { byState, byPurpose, total: escrows.length, recent: events.slice(0, recentCount) };
}

/* ------------------------------------------------------ reconciliation */

/** The slice of an audit row a reconciliation run needs. */
export type AuditRunLike = { createdAt: string; metadata: unknown };

function outcomeOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const value = (metadata as Record<string, unknown>)["outcome"];
    return typeof value === "string" ? value : null;
  }
  return null;
}

/**
 * Health from `wallet.reconciliation.run` audit rows: every run in a window
 * when `windowDays` is given (`lib/admin/reads/money.ts`), or the newest page of them
 * otherwise, in which case `pageOnly` is true and the panel says "of the last
 * N runs".
 * `expectedRuns` and `lastReply` stay null; both need the job's schedule and
 * `private.reconciliation_watch`, which no admin read reaches yet.
 */
export function reconciliationFromAudit(
  rows: readonly AuditRunLike[],
  /** Set when the rows are EVERY run in a window, rather than a page. */
  windowDays: number | null = null,
): ReconciliationHealth {
  const sorted = [...rows].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const clean = sorted.filter((r) => outcomeOf(r.metadata) === "clean");
  const attention = sorted.filter((r) => outcomeOf(r.metadata) === "needs_attention");
  const oldest = sorted.at(-1);
  const newest = sorted[0];
  const spanDays =
    oldest && newest
      ? Math.max(1, Math.ceil((Date.parse(newest.createdAt) - Date.parse(oldest.createdAt)) / DAY_MS))
      : 0;
  return {
    windowDays: windowDays ?? spanDays,
    runs: sorted.length,
    clean: clean.length,
    needsAttention: attention.length,
    expectedRuns: null,
    lastRunAt: newest?.createdAt ?? null,
    lastCleanAt: clean[0]?.createdAt ?? null,
    lastReply: null,
    pageOnly: windowDays === null,
  };
}

export type ReconciliationVerdict = "healthy" | "attention" | "quiet" | "never";

/**
 * One word for the panel's badge.
 *
 * QUIET BEATS EVERYTHING. A job whose last clean run is recent but which has
 * since stopped firing is the exact failure that went unseen for three weeks
 * (`lib/cron/freshness.ts`), so silence past the watch's own allowance is
 * reported before any share of clean runs is.
 */
export function reconciliationVerdict(
  health: ReconciliationHealth,
  now: number,
  maxGapHours: number,
): ReconciliationVerdict {
  if (!health.lastRunAt) return "never";
  if (now - Date.parse(health.lastRunAt) > maxGapHours * 3_600_000) return "quiet";
  if (health.needsAttention > 0 && health.lastCleanAt !== health.lastRunAt) return "attention";
  return "healthy";
}

/** The ring's figure: clean runs as a whole percentage of the runs counted. */
export function cleanShare(health: ReconciliationHealth): number | null {
  const denominator = health.expectedRuns ?? health.runs;
  if (denominator <= 0) return null;
  return Math.round((health.clean / denominator) * 100);
}

/** The slice of a `rent_payments` row the rent panel needs, already joined to its booking. */
export type RentChargeLike = Omit<RentChargeRow, "state" | "listingTitle" | "tenantName"> & {
  listingTitle?: string | null;
  tenantName?: string | null;
  /** The carrying booking's status, null when the booking was not found. */
  bookingStatus: string | null;
  /** A SUCCESSFUL transaction has settled against the carrying booking. */
  paid: boolean;
};

/**
 * Where a tenancy charge stands, from its booking and its payment. A cancelled
 * booking is cancelled whether or not money moved (the refund is the booking
 * refund's record); a no-show is its own word; a paid charge is paid; an
 * unpaid PENDING one is awaiting the tenant. Anything else (a CONFIRMED or
 * COMPLETED booking with no settled payment, or a charge whose booking was not
 * found) is not guessed at: it is "check", and the desk says a person should look.
 */
export function rentChargeState(bookingStatus: string | null, paid: boolean): RentChargeState {
  if (bookingStatus === "CANCELLED") return "cancelled";
  if (bookingStatus === "NO_SHOW") return "no_show";
  if (paid && bookingStatus !== null) return "paid";
  if (bookingStatus === "PENDING") return "awaiting";
  return "check";
}

/** Every rent charge into exact counts by state, two kobo sums and the newest `latest`. */
export function rentFromWhole(
  charges: readonly RentChargeLike[],
  total: number,
  complete: boolean,
  latest = 6,
): RentCharges {
  const byState: Record<RentChargeState, number> = { awaiting: 0, paid: 0, cancelled: 0, no_show: 0, check: 0 };
  let paidMinor = 0;
  let awaitingMinor = 0;
  const rows: RentChargeRow[] = [];
  for (const c of charges) {
    const state = rentChargeState(c.bookingStatus, c.paid);
    byState[state] += 1;
    if (state === "paid") paidMinor += c.totalMinor;
    if (state === "awaiting") awaitingMinor += c.totalMinor;
    rows.push({
      id: c.id,
      bookingId: c.bookingId,
      listingTitle: c.listingTitle ?? null,
      tenantName: c.tenantName ?? null,
      moveIn: c.moveIn,
      rentPeriod: c.rentPeriod,
      totalMinor: c.totalMinor,
      currency: c.currency,
      state,
      createdAt: c.createdAt,
    });
  }
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  return {
    total,
    byState,
    paidMinor,
    awaitingMinor,
    latest: rows.slice(0, latest),
    complete: complete && charges.length === total,
  };
}
