import "server-only";

/**
 * What has actually settled, read from the ledger.
 *
 * ledger_entries is the decomposition of every settled charge: gross, the
 * platform's share, the agent's share and the processor's charge, with a check
 * constraint saying the three parts add up to the gross. That makes it the only
 * honest source for an earnings page. ledger_host_select already scopes a read
 * to the caller's own bookings, so this file reads under the agent's own client
 * and never restates the ownership rule.
 *
 * Nothing here estimates, projects or annualises. If the ledger is empty the
 * answer is zero rows, and the page says so in plain words. Today that is the
 * expected state: the ledger writer is still being built, so an empty page here
 * is the truth rather than a gap.
 *
 * All money is integer kobo.
 */

import type { Database } from "../supabase/database.types";
import type { AgentContext } from "./listings-queries";

/** One settled month, in the order money actually arrived. */
export type EarningsMonth = {
  /** "2026-07", Lagos calendar. Stable key for React and for sorting. */
  key: string;
  year: number;
  /** 1 to 12, so the caller can build a localised label. */
  month: number;
  grossMinor: number;
  agentShareMinor: number;
  platformShareMinor: number;
  processorMinor: number;
  netSettlementMinor: number;
  /** Distinct bookings that settled in the month. */
  stays: number;
};

export type AgentEarnings = {
  /** Newest month first. Empty until money has moved. */
  months: EarningsMonth[];
  totalGrossMinor: number;
  totalAgentShareMinor: number;
  totalNetMinor: number;
  /** Distinct bookings with at least one settled entry. */
  settledStays: number;
  /** The Lagos month we are in now, or null when nothing settled in it. */
  currentMonth: EarningsMonth | null;
  /**
   * False when the ledger read itself failed. The page then says the figures
   * are unavailable rather than showing a confident zero.
   */
  readable: boolean;
};

type LedgerRow = {
  booking_id: string;
  gross_minor: number;
  platform_fee_minor: number;
  agent_share_minor: number;
  processor_fee_minor: number;
  net_settlement_minor: number;
  created_at: string;
};

/** A settled charge is permanent, so the whole history is worth carrying. */
const MAX_ROWS = 2000;

/** "YYYY-MM" in Lagos, so a late-night settlement lands in the right month. */
function lagosMonthKey(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "0000-00";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" })
    .format(parsed)
    .slice(0, 7);
}

function emptyEarnings(readable: boolean): AgentEarnings {
  return {
    months: [],
    totalGrossMinor: 0,
    totalAgentShareMinor: 0,
    totalNetMinor: 0,
    settledStays: 0,
    currentMonth: null,
    readable,
  };
}

/**
 * The caller's settled earnings, by month and in total.
 *
 * Null means the question does not apply to this visitor: Supabase is not
 * configured, nobody is signed in, or the signed-in person holds no agents row.
 * The page keeps its own designed rendering for those three.
 */
export async function readAgentEarnings(context: AgentContext): Promise<AgentEarnings | null> {
  if (context.state !== "agent") return null;

  const { data, error } = await context.supabase
    .from("ledger_entries")
    .select(
      "booking_id, gross_minor, platform_fee_minor, agent_share_minor, processor_fee_minor, net_settlement_minor, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);

  if (error) return emptyEarnings(false);
  const rows = (data ?? []) as LedgerRow[];
  if (rows.length === 0) return emptyEarnings(true);

  const buckets = new Map<string, EarningsMonth & { bookingIds: Set<string> }>();
  const allBookings = new Set<string>();

  let totalGrossMinor = 0;
  let totalAgentShareMinor = 0;
  let totalNetMinor = 0;

  for (const row of rows) {
    const key = lagosMonthKey(row.created_at);
    const [yearPart, monthPart] = key.split("-");
    const bucket =
      buckets.get(key) ??
      {
        key,
        year: Number(yearPart ?? 0),
        month: Number(monthPart ?? 0),
        grossMinor: 0,
        agentShareMinor: 0,
        platformShareMinor: 0,
        processorMinor: 0,
        netSettlementMinor: 0,
        stays: 0,
        bookingIds: new Set<string>(),
      };

    bucket.grossMinor += row.gross_minor;
    bucket.agentShareMinor += row.agent_share_minor;
    bucket.platformShareMinor += row.platform_fee_minor;
    bucket.processorMinor += row.processor_fee_minor;
    bucket.netSettlementMinor += row.net_settlement_minor;
    bucket.bookingIds.add(row.booking_id);
    buckets.set(key, bucket);

    allBookings.add(row.booking_id);
    totalGrossMinor += row.gross_minor;
    totalAgentShareMinor += row.agent_share_minor;
    totalNetMinor += row.net_settlement_minor;
  }

  const months: EarningsMonth[] = [...buckets.values()]
    .map(({ bookingIds, ...month }) => ({ ...month, stays: bookingIds.size }))
    .sort((a, b) => b.key.localeCompare(a.key));

  const nowKey = lagosMonthKey(new Date().toISOString());

  return {
    months,
    totalGrossMinor,
    totalAgentShareMinor,
    totalNetMinor,
    settledStays: allBookings.size,
    currentMonth: months.find((month) => month.key === nowKey) ?? null,
    readable: true,
  };
}

/** Re-exported so a caller needs one import site for the ledger's shape. */
export type LedgerEntryRow = Database["public"]["Tables"]["ledger_entries"]["Row"];
