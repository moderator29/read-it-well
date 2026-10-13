import "server-only";
import { reportReadError } from "@/lib/observability/read-error";
import { reportError } from "@/lib/observability/report";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fixFor, funnelFrom, type Fix, type Funnel, type FunnelRpcRow } from "@/lib/agent/funnel";
import { lagosToday } from "@/lib/agent/calendar-model";
import { lagosDayOf, type CountContext, type RequestRow } from "@/components/agent/intel/space-model";

/**
 * THE READS BEHIND SPACE ANALYTICS (feature register J3; D25 inner pages).
 *
 * Nothing new is asked of the database. Every read here is one the lister's
 * own RLS-bound client already answers, in the shape the existing reads use:
 * `lib/agent/analytics-queries.ts` (bookings by the joined listing's
 * agent_id, two thousand rows at most, restated here because that file keeps
 * its row read private) and `public.listing_funnel` per published listing,
 * which answers only the listing's own lister and returns no median unless
 * five other listers' listings exist: the privacy floor is the database's,
 * not this file's. This file is now the only reader of the funnel; the old
 * ten-listing board read it replaced has been removed.
 *
 * Every read resolves to a value or to "unavailable"; none throws. A page
 * that cannot read says so in its own words, inside its own shell, rather
 * than falling through to the workspace's error boundary.
 */

type Db = SupabaseClient<Database>;

/** The bookings ceiling, the same two thousand `analytics-queries.ts` holds. */
export const MAX_REQUEST_ROWS = 2000;

/**
 * How many published listings' funnels are read for a total. Above this the
 * per-listing figures are still shown, but no total is printed, because a sum
 * over some listings is a smaller number dressed as the whole.
 */
export const MAX_FUNNEL_LISTINGS = 40;

/** How many funnel calls are in flight at once. */
const FUNNEL_BATCH = 8;

export type RequestRead =
  | { state: "unavailable" }
  | { state: "ok"; rows: RequestRow[]; ctx: CountContext };

/**
 * Every request against this lister's listings, newest first, with only the
 * three columns the counting needs, and the two edges the counting must know:
 * the day the lister joined and, when the ceiling was hit, the day of the
 * oldest row read.
 */
export async function readRequests(supabase: Db, agentId: string): Promise<RequestRead> {
  try {
    const [bookings, agent] = await Promise.all([
      supabase
        .from("bookings")
        .select("listing_id, status, created_at, listings!inner(agent_id)")
        .eq("listings.agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(MAX_REQUEST_ROWS),
      supabase.from("agents").select("created_at").eq("id", agentId).maybeSingle(),
    ]);
    await reportReadError("read.space.readRequests", bookings.error);
    if (bookings.error) return { state: "unavailable" };

    const raw = (bookings.data ?? []) as unknown as { listing_id: string; status: string; created_at: string }[];
    const rows: RequestRow[] = raw.map((r) => ({ listingId: r.listing_id, status: r.status, createdAt: r.created_at }));
    const oldest = raw[raw.length - 1]?.created_at;
    await reportReadError("read.space.readRequests", agent.error);
    const joined = agent.error ? null : (agent.data as { created_at?: string } | null)?.created_at ?? null;

    return {
      state: "ok",
      rows,
      ctx: {
        todayKey: lagosToday(),
        joinedKey: joined ? lagosDayOf(joined) : null,
        horizonKey: raw.length >= MAX_REQUEST_ROWS && oldest ? lagosDayOf(oldest) : null,
      },
    };
  } catch (error) {
    await reportError({ error, context: { kind: "read.agent_requests" } });
    return { state: "unavailable" };
  }
}

export type ListingFunnelRead = {
  id: string;
  title: string;
  /** When it went live: before this day it could not be asked for. */
  publishedAt: string | null;
  funnel: Funnel;
  fix: Fix | null;
};

export type FunnelsRead =
  | { state: "unavailable" }
  | {
      state: "ok";
      listings: ListingFunnelRead[];
      /** Every published listing was read, so a total is a true total. */
      complete: boolean;
      /** How many listings are live, as the database counted them. */
      published: number;
    };

type FunnelListingRow = {
  id: string;
  title: string;
  rent_period: string | null;
  total_move_in_cost_minor: number | null;
  published_at: string | null;
  listing_photos: { id: string }[] | null;
};

/** `listing_funnel` is not in the generated types, so it is called loosely. */
async function callFunnel(supabase: Db, listingId: string): Promise<{ rows: FunnelRpcRow[] | null; failed: boolean }> {
  const { data, error } = await (
    supabase as unknown as { rpc: (fn: string, args: object) => Promise<{ data: unknown; error: unknown }> }
  ).rpc("listing_funnel", { p_listing: listingId });
  await reportReadError("read.space.callFunnel", error);
  return { rows: error ? null : (data as FunnelRpcRow[] | null), failed: Boolean(error) };
}

function withFix(row: FunnelListingRow, funnel: Funnel): ListingFunnelRead {
  return {
    id: row.id,
    title: row.title,
    publishedAt: row.published_at,
    funnel,
    fix: fixFor(funnel, {
      photoCount: row.listing_photos?.length ?? 0,
      moveInStated: row.rent_period === null || (row.total_move_in_cost_minor ?? 0) > 0,
      publishedDays: daysSince(row.published_at),
    }),
  };
}

/**
 * The week of every published listing, up to the ceiling, eight at a time.
 * One failed call means the counting is not running (the migration is not
 * applied, or the function errored) and the whole board is unavailable:
 * half a board would read as "the rest had none".
 */
export async function readFunnels(supabase: Db, agentId: string): Promise<FunnelsRead> {
  try {
    const { data, error, count } = await supabase
      .from("listings")
      .select("id, title, rent_period, total_move_in_cost_minor, published_at, listing_photos(id)", { count: "exact" })
      .eq("agent_id", agentId)
      .eq("status", "PUBLISHED")
      .order("updated_at", { ascending: false })
      .limit(MAX_FUNNEL_LISTINGS);
    await reportReadError("read.space.readFunnels", error);
    if (error || !data) return { state: "unavailable" };

    const rows = data as unknown as FunnelListingRow[];
    /* In batches rather than all at once: each call takes a median over
       every similar live listing in the city, so forty at once would land on
       the database as forty scans in the same instant. Eight at a time keeps
       ten listings (the old board's whole read, then sequential) to two round
       trips. */
    const calls: Awaited<ReturnType<typeof callFunnel>>[] = [];
    for (let at = 0; at < rows.length; at += FUNNEL_BATCH) {
      const batch = await Promise.all(rows.slice(at, at + FUNNEL_BATCH).map((row) => callFunnel(supabase, row.id)));
      if (batch.some((call) => call.failed)) return { state: "unavailable" };
      calls.push(...batch);
    }

    const listings: ListingFunnelRead[] = [];
    rows.forEach((row, i) => {
      const funnel = funnelFrom(calls[i]?.rows ?? null);
      if (funnel) listings.push(withFix(row, funnel));
    });
    const published = count ?? rows.length;
    return { state: "ok", listings, complete: published <= rows.length && listings.length === rows.length, published };
  } catch (error) {
    await reportError({ error, context: { kind: "read.agent_funnels" } });
    return { state: "unavailable" };
  }
}

export type OneFunnelRead =
  | { state: "missing" | "unavailable" }
  | { state: "example" | "not-live"; title: string }
  | { state: "ok"; listing: ListingFunnelRead };

/**
 * One listing's week, for its own inner page. "missing" covers both a wrong
 * id and somebody else's listing, so the page never confirms that a listing
 * it will not show exists.
 */
export async function readOneFunnel(supabase: Db, agentId: string, listingId: string): Promise<OneFunnelRead> {
  if (!UUID.test(listingId)) return { state: "missing" };
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title, status, is_demo, rent_period, total_move_in_cost_minor, published_at, listing_photos(id)")
      .eq("id", listingId)
      .eq("agent_id", agentId)
      .maybeSingle();
    await reportReadError("read.space.readOneFunnel", error);
    if (error) return { state: "unavailable" };
    if (!data) return { state: "missing" };
    const row = data as unknown as FunnelListingRow & { status: string; is_demo: boolean };
    if (row.is_demo) return { state: "example", title: row.title };
    if (row.status !== "PUBLISHED") return { state: "not-live", title: row.title };

    const call = await callFunnel(supabase, row.id);
    if (call.failed) return { state: "unavailable" };
    const funnel = funnelFrom(call.rows);
    if (!funnel) return { state: "unavailable" };
    return { state: "ok", listing: withFix(row, funnel) };
  } catch (error) {
    await reportError({ error, context: { kind: "read.agent_one_funnel" } });
    return { state: "unavailable" };
  }
}

/** Titles of this lister's listings by id, for naming rows in a breakdown. */
export async function readListingTitles(supabase: Db, agentId: string): Promise<Map<string, string> | null> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("id, title")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(MAX_REQUEST_ROWS);
    await reportReadError("read.space.readListingTitles", error);
    if (error) return null;
    return new Map(((data ?? []) as { id: string; title: string }[]).map((l) => [l.id, l.title]));
  } catch (error) {
    await reportError({ error, context: { kind: "read.agent_listing_titles" } });
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whole days since an instant, zero when unknown or in the future. */
function daysSince(iso: string | null): number {
  if (!iso) return 0;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.floor((Date.now() - at) / 86_400_000));
}
