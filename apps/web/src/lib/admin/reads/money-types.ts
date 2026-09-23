import type { Database } from "@/lib/supabase/database.types";

/**
 * THE SHAPES THE MONEY DESKS ARE BUILT AGAINST, AND NOTHING ELSE.
 *
 * Types only. There is no query in this folder and there must never be one:
 * the console's reads belong to `lib/admin/**`, which is the other session's,
 * and a second query layer here would collide with the one they are building.
 * Each type below is the exact return shape asked for in
 * `docs/SESSION_B_SCOPE.md` under "Requests from admin-money" (the number is on
 * each), so the function that lands can return it verbatim and the panel that
 * reads it lights up with a one-line import.
 *
 * Until a function lands, its panel receives `null` and draws the not-wired
 * state, which says what the panel will show and nothing about a number.
 *
 * Money is integer kobo throughout. Nothing here divides.
 */

export type EscrowState = Database["public"]["Enums"]["escrow_state"];
export type EscrowPurpose = Database["public"]["Enums"]["escrow_purpose"];

/** Request 2. The four KPI cards on `/admin/money`. */
export type MoneyPulse = {
  asOf: string;
  floatMinor: number;
  floatWeekAgoMinor: number;
  inEscrowMinor: number;
  inEscrowWeekAgoMinor: number;
  settledMinor: { thisWeek: number; lastWeek: number };
  failedCharges: {
    thisWeek: { count: number; amountMinor: number };
    lastWeek: { count: number; amountMinor: number };
  };
};

/** Request 3. "Money in vs money out" and "Transaction summary". */
export type MoneyFlow = {
  months: { month: string; inMinor: number; outMinor: number }[];
  last30Days: { inMinor: number; outMinor: number };
  firstEntryAt: string | null;
};

/** Request 4. One row of the ledger table. */
export type LedgerRow = {
  id: string;
  createdAt: string;
  kind: string;
  direction: "credit" | "debit";
  amountMinor: number;
  status: string;
  reference: string;
  note: string | null;
  ownerName: string | null;
  /** The platform float straight after this entry. Null under a filter. */
  balanceAfterMinor: number | null;
};

/** Request 4. The ledger table and its numbered pager. */
export type LedgerPage = {
  rows: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
};

/** Request 6. The pipeline, the purpose donut and recent activity on `/admin/escrow`. */
export type EscrowEvent =
  | "opened"
  | "funded"
  | "held"
  | "release_requested"
  | "released"
  | "refunded"
  | "disputed"
  | "resolved";

export type EscrowActivity = {
  escrowId: string;
  event: EscrowEvent;
  at: string;
  amountMinor: number;
  listingTitle: string | null;
};

export type EscrowPipeline = {
  /* Keyed by string, not by the generated enum: the live database carries
     values the generated types do not yet (`CANCELLED`, `agency_fee`, checked
     23 September), and a value the types lag behind must count, not crash. */
  byState: Record<EscrowState | string, { count: number; amountMinor: number }>;
  byPurpose: Record<EscrowPurpose | string, { count: number; amountMinor: number }>;
  total: number;
  recent: EscrowActivity[];
};

/** Request 8. "Reconciliation health" and "Reconciliation check". */
export type ReconciliationHealth = {
  windowDays: number;
  runs: number;
  clean: number;
  needsAttention: number;
  /** From the schedule, so a run that never fired lowers the figure. Null when unknown. */
  expectedRuns: number | null;
  lastRunAt: string | null;
  lastCleanAt: string | null;
  lastReply: { at: string; status: number | null; verdict: string } | null;
  /** True when the read behind it was a page, so the figures cover the last `runs` runs only. */
  pageOnly: boolean;
};

/** Request 9. Every panel on `/admin/supply`. */
export type SupplyRoleKey = "owner" | "agent" | "firm" | "host";

export const SUPPLY_ROLE_KEYS: readonly SupplyRoleKey[] = ["owner", "agent", "firm", "host"];

export type SupplyRow = {
  id: string;
  kind: "agent" | "business";
  name: string;
  role: SupplyRoleKey;
  verified: boolean;
  listings: number;
  transactedMinor: number;
  joinedAt: string;
};

export type SupplyConsole = {
  counts: Record<SupplyRoleKey, { now: number; weekAgo: number }>;
  examplesExcluded: number;
  rows: SupplyRow[];
  total: number;
  page: number;
  pageSize: number;
  growth: { month: string; counts: Record<SupplyRoleKey, number> }[];
  topAreas: { area: string; count: number }[];
  byPropertyType: { type: string; count: number }[];
};
