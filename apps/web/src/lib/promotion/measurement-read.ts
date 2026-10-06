import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { reportReadError } from "@/lib/observability/read-error";
import { reportError } from "@/lib/observability/report";
import { BASELINE_DAYS, LISTER_GAPS, countOrNoData, type ListingMeasurementRead, type MetricGap } from "./measurement";
import type { PromotionMetric } from "./tiers";

/**
 * ONE LISTING'S LAST THIRTY DAYS, READ FOR ITS OWN LISTER
 * (`VALLO_PROMOTION-v2.md` section 11: "nine are already tracked").
 *
 * Through the lister's own RLS-bound client, as `lib/agent/analytics-queries.ts`
 * and `app/agent/_intel/space-read.ts` read: the policies already say who may
 * read what, and this file never restates or widens them. NO SERVICE ROLE:
 * where the lister's client cannot read a table, the figure is no data with
 * its reason, and the missing read is a Session 2 request, never a bypass.
 *
 * WHAT THE LISTER CAN READ, CHECKED AGAINST THE MIGRATIONS:
 *
 *   inquiries     `conversations` by `listing_id`, opened in the window.
 *                 `conversations_select`: the lister is the thread's agent.
 *   contacts      `enquiry_stages` for this listing's threads whose stage the
 *                 lister last set in the window. `enquiry_stages_lister_reads`.
 *   viewings      `inspection_requests` marked COMPLETED in the window
 *                 (`completed_at`). `inspection_requests_select_party`.
 *   bookings      `bookings` requested in the window that were confirmed
 *                 (CONFIRMED, COMPLETED, NO_SHOW). `bookings_host_select`.
 *
 * WHAT IT CANNOT, and so reads as no data (`LISTER_GAPS` in `measurement.ts`):
 *
 *   impressions,  `listing_daily_stats` is granted to no client role; the only
 *   views         lister read is `listing_funnel`, which answers a fixed seven
 *                 days, not thirty (V-73).
 *   unique        `listing_view_marks` holds one Lagos day under a salt that
 *   viewers       is deleted with it, hourly; no thirty-day count of different
 *                 people exists anywhere to read.
 *   saves         `saved_items_own`: each member reads only their own saves.
 *   shares        `share_links`: no client grant at all (V-07).
 *   transactions  `transactions`: the paying guest and staff only.
 *
 * Every count is `count: "exact"` with `head: true`: a whole number from the
 * database, no rows carried, no ceiling to undercount against. A count that
 * errored is no data ("readFailed"), reported with `reportReadError`, never 0.
 */

type Db = SupabaseClient<Database>;

/** A booking that became one: confirmed, and then stayed or did not show. */
const BOOKED = ["CONFIRMED", "COMPLETED", "NO_SHOW"] as const;

const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KIND = "read.promotion.readListingMeasurement" as const;

type CountAnswer = { count: number | null; error: unknown };

/**
 * `enquiry_stages` and `inspection_requests.completed_at` are not in the
 * generated types, so those two counts are asked loosely, as `space-read.ts`
 * calls `listing_funnel`.
 */
type LooseQuery = PromiseLike<CountAnswer> & {
  eq: (column: string, value: unknown) => LooseQuery;
  gte: (column: string, value: unknown) => LooseQuery;
};
type LooseDb = { from: (table: string) => { select: (columns: string, options: { count: "exact"; head: true }) => LooseQuery } };

/** One count, reported when refused, and no data rather than zero when it is. */
async function countOf(answer: CountAnswer): Promise<number | null> {
  await reportReadError(KIND, answer.error);
  if (answer.error) return null;
  return countOrNoData(answer.count);
}

/**
 * The listing's last thirty days. `listingId` null is the onboarding opened
 * with no listing. A wrong id and somebody else's listing both answer
 * "missing". Never throws.
 */
export async function readListingMeasurement(
  supabase: Db,
  agentId: string,
  listingId: string | null,
  now: Date = new Date(),
): Promise<ListingMeasurementRead> {
  if (!listingId) return { state: "no-listing" };
  if (!UUID.test(listingId)) return { state: "missing" };
  try {
    const listing = await supabase
      .from("listings")
      .select("id, is_demo")
      .eq("id", listingId)
      .eq("agent_id", agentId)
      .maybeSingle();
    await reportReadError(KIND, listing.error);
    if (listing.error) return { state: "unavailable" };
    if (!listing.data) return { state: "missing" };
    if (listing.data.is_demo) return { state: "example" };

    const since = new Date(now.getTime() - BASELINE_DAYS * DAY_MS).toISOString();
    const loose = supabase as unknown as LooseDb;
    const head = { count: "exact", head: true } as const;

    const [inquiries, contacts, viewings, bookings] = await Promise.all([
      supabase.from("conversations").select("id", head).eq("listing_id", listingId).gte("created_at", since),
      loose
        .from("enquiry_stages")
        .select("conversation_id, conversations!inner(listing_id)", head)
        .eq("conversations.listing_id", listingId)
        .gte("set_at", since),
      loose
        .from("inspection_requests")
        .select("id", head)
        .eq("listing_id", listingId)
        .eq("state", "COMPLETED")
        .gte("completed_at", since),
      supabase
        .from("bookings")
        .select("id", head)
        .eq("listing_id", listingId)
        .in("status", [...BOOKED])
        .gte("created_at", since),
    ]);

    const read = {
      inquiries: await countOf(inquiries),
      contacts: await countOf(contacts),
      viewings: await countOf(viewings),
      bookings: await countOf(bookings),
    };

    const values = {} as Record<PromotionMetric, number | null>;
    const gaps: Partial<Record<PromotionMetric, MetricGap>> = { ...LISTER_GAPS };
    for (const metric of Object.keys(LISTER_GAPS) as PromotionMetric[]) values[metric] = null;
    for (const [metric, value] of Object.entries(read) as [PromotionMetric, number | null][]) {
      values[metric] = value;
      if (value === null) gaps[metric] = "readFailed";
    }
    return { state: "ok", measurement: { windowDays: BASELINE_DAYS, values, gaps } };
  } catch (error) {
    await reportError({ error, context: { kind: "read.promotion_measurement" } });
    return { state: "unavailable" };
  }
}
