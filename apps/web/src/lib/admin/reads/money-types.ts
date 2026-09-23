import type { Database } from "@/lib/supabase/database.types";

/**
 * THE SHAPES THE MONEY DESKS ARE BUILT AGAINST, AND NOTHING ELSE.
 *
 * Types only. There is no query in this folder and there must never be one:
 * the console's queries live in `lib/admin/**`, and a second query layer here
 * would duplicate them. Each type below is the exact return shape a money
 * desk panel needs, so the function that provides it can return it verbatim and the panel that
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
  /** The wallet owner's user id, for the badge slot. */
  ownerId?: string | null;
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
  /** The account's user (an agent's user, a business's owner), for the badge slot. */
  userId?: string | null;
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

/**
 * Tenancy charges (`rent_payments`) on the money desk. A charge has no status
 * column of its own: it rides a `bookings` row through the booking rails, so
 * where it stands is read from that row's status and from whether a
 * SUCCESSFUL transaction has settled against it.
 */
export type RentChargeState = "awaiting" | "paid" | "cancelled" | "no_show" | "check";

export const RENT_CHARGE_STATES: readonly RentChargeState[] = ["awaiting", "paid", "cancelled", "no_show", "check"];

export type RentChargeRow = {
  id: string;
  bookingId: string;
  listingTitle: string | null;
  tenantName: string | null;
  /** The tenant's user id, for the badge slot. */
  tenantId?: string | null;
  moveIn: string;
  rentPeriod: string;
  totalMinor: number;
  currency: string;
  state: RentChargeState;
  createdAt: string;
};

export type RentCharges = {
  /** Exact count of `rent_payments`. */
  total: number;
  byState: Record<RentChargeState, number>;
  /** Sum of the frozen totals of paid charges, kobo. */
  paidMinor: number;
  /** Sum of the frozen totals of charges still awaiting payment, kobo. */
  awaitingMinor: number;
  /** Newest first. */
  latest: RentChargeRow[];
  /** False when the table is larger than one pass reads, or the count disagreed. */
  complete: boolean;
};
