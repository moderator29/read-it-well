import "server-only";
import { reportReadError } from "@/lib/observability/read-error";
import { callLandlordRpc } from "@/lib/landlord/rpc";
import {
  addDays,
  lagosDay,
  ownerView,
  parseAgreementsWaiting,
  parseBuildings,
  parseEarnings,
  parseTenancies,
  parseVisits,
  type EarningRow,
  type OwnerInputs,
  type OwnerView,
} from "./dashboard-model";

/**
 * THE OWNER DASHBOARD'S READS, UNDER THE OWNER'S OWN CLIENT.
 *
 * Five independent reads, so one failing degrades one card rather than the
 * page, and each answers `null` for "could not read" and a real list (maybe
 * empty) otherwise. Nothing is written, and nothing here is a balance:
 *
 *   my_buildings          the owner's rental units and whether each is let
 *   rent_payments         the rent charges opened for this owner's tenants
 *                         (RLS: the lister reads their own)
 *   my_earnings_history   the payments the owner was paid for through Vallo
 *                         and their reversals (a function that answers only
 *                         for the caller); paged until the window is covered
 *   inspection_requests   confirmed visits in the next week (RLS: the lister)
 *   deal_agreements       agreements still waiting for a confirmation, where
 *                         this owner has not confirmed the current terms
 *
 * Money is only ever what a payer paid inside Vallo. A tenancy that has no
 * successful payment is never "let through Vallo" and never counted as rent.
 */

type Reply = { data: unknown; error: { code?: string | null; message?: string | null } | null };
type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<Reply>;
type Query = {
  select: (columns: string) => Query;
  eq: (column: string, value: string) => Query;
  in: (column: string, values: readonly string[]) => Query;
  gte: (column: string, value: string) => Query;
  lte: (column: string, value: string) => Query;
  order: (column: string, opts: { ascending: boolean }) => Query;
  limit: (n: number) => PromiseLike<Reply>;
};
type Db = { rpc: Rpc; from: (table: string) => Query };

/** How far back the payment read goes: a 12 month tenancy opened a year ago ends within the 90 day look-ahead. */
export const PAYMENT_WINDOW_DAYS = 430;
const PAGE = 200;
const MAX_PAGES = 8;
const TENANCY_CEILING = 500;

/**
 * Every payment the owner was paid for since `since` (an ISO instant), newest
 * first, paged with `p_before`. Null when a page failed, or when the pages ran
 * out before the window was covered: an incomplete payment history would
 * understate rent, and a short count is a wrong number.
 */
export async function readEarningsSince(db: Db, since: string): Promise<EarningRow[] | null> {
  const rows: EarningRow[] = [];
  let before: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await db.rpc("my_earnings_history", { p_limit: PAGE, p_before: before });
    await reportReadError("read.workspace.readEarningsSince", error);
    if (error || !Array.isArray(data)) return null;
    const batch = parseEarnings(data);
    rows.push(...batch);
    const oldest = (data as { occurred_at?: unknown }[]).reduce<string | null>((min, r) => {
      const at = typeof r.occurred_at === "string" && Number.isFinite(Date.parse(r.occurred_at)) ? r.occurred_at : null;
      return at && (min === null || Date.parse(at) < Date.parse(min)) ? at : min;
    }, null);
    const floor = Date.parse(since);
    const inWindow = () => rows.filter((r) => Date.parse(r.occurredAt) >= floor);
    if (data.length < PAGE) return inWindow();
    if (oldest === null || Date.parse(oldest) < floor) return inWindow();
    before = oldest;
  }
  return null;
}

async function safe<T>(read: () => Promise<T | null>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function readOwnerInputs(supabaseClient: unknown, userId: string, now: Date): Promise<OwnerInputs> {
  const db = supabaseClient as Db;
  const today = lagosDay(now);
  const since = new Date(now.getTime() - PAYMENT_WINDOW_DAYS * 86_400_000).toISOString();
  const weekEnd = new Date(Date.parse(`${addDays(today, 7)}T00:00:00Z`) - 3_600_000).toISOString();

  const [buildings, tenancies, earnings, visits, agreements] = await Promise.all([
    safe(async () => {
      const { data, error } = await callLandlordRpc(db, "my_buildings", {});
      await reportReadError("read.workspace.myBuildings", error);
      return error ? null : parseBuildings(data);
    }),
    safe(async () => {
      const { data, error } = await db
        .from("rent_payments")
        .select("id, listing_id, booking_id, move_in, rent_period, rent_minor, total_minor, created_at")
        .eq("lister_id", userId)
        .order("created_at", { ascending: false })
        .limit(TENANCY_CEILING);
      await reportReadError("read.workspace.rentPayments", error);
      /* At the ceiling the list could be short, and a short list is a wrong figure. */
      if (error || !Array.isArray(data) || data.length >= TENANCY_CEILING) return null;
      return parseTenancies(data);
    }),
    safe(() => readEarningsSince(db, since)),
    safe(async () => {
      const { data, error } = await db
        .from("inspection_requests")
        .select("id, slot_at, state, listings(title)")
        .eq("lister_id", userId)
        .eq("state", "CONFIRMED")
        .gte("slot_at", now.toISOString())
        .lte("slot_at", weekEnd)
        .order("slot_at", { ascending: true })
        .limit(100);
      await reportReadError("read.workspace.ownerVisits", error);
      return error || !Array.isArray(data) ? null : parseVisits(data);
    }),
    safe(async () => {
      const { data, error } = await db
        .from("deal_agreements")
        .select("id, listing_id, kind, status, terms_version, owner_confirmed_version, updated_at")
        .eq("owner_id", userId)
        .eq("status", "awaiting_parties")
        .order("updated_at", { ascending: true })
        .limit(50);
      await reportReadError("read.workspace.ownerAgreements", error);
      return error || !Array.isArray(data) ? null : parseAgreementsWaiting(data);
    }),
  ]);

  return { buildings, tenancies, earnings, visits, agreements };
}

/** The owner dashboard's view model: the reads, then the arithmetic. */
export async function readOwnerDashboard(supabaseClient: unknown, userId: string, now: Date): Promise<OwnerView> {
  return ownerView(await readOwnerInputs(supabaseClient, userId, now), now);
}
