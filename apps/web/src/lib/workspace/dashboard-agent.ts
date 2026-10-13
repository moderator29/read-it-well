import "server-only";
import { reportReadError } from "@/lib/observability/read-error";
import { funnelFrom, type FunnelRpcRow } from "@/lib/agent/funnel";
import { SUPABASE_URL } from "@/lib/supabase/env";
import {
  addDays,
  lagosDay,
  parseEnquiries,
  parseVisits,
  windowStartDay,
  type EnquiryRow,
  type Visit,
} from "./dashboard-model";

/**
 * THE AGENT DASHBOARD'S READS, UNDER THE AGENT'S OWN CLIENT.
 *
 * Each read is independent and answers `null` for "could not read" (the card
 * says so) or a real answer, empty included. Rows are bounded: at the API's
 * ceiling the list could be short, and a short count is a wrong number, so a
 * read that hits it answers `null` rather than a quiet undercount.
 *
 *   conversations        listing enquiry threads opened to this agent, six months
 *   inspection_requests  confirmed and completed visits, six months back to a
 *                        few months ahead (the chart, the calendar, the tiles)
 *   listings             deals closed in the last 90 days (a listing closed as
 *                        let, by the platform's own close reasons)
 *   listing_funnel       the featured listing's last seven days (its own RPC,
 *                        which answers only to the listing's lister)
 *   listing_photos       the featured listing's first photograph
 *
 * The follow-ups and the desk's stages are read by `lib/enquiry`, and the
 * contacts come from the inbox the page already reads.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** A listing photograph's public address: the world-readable `listing-photos` bucket. */
function photoAddress(storagePath: string): string {
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/listing-photos/${storagePath}`;
}

const CEILING = 1000;
/** Visits are read this far ahead of today: the tile counts what is booked, and a booking further out than this is rare. */
export const VISIT_LOOKAHEAD_DAYS = 120;
/** The look-back of the monthly chart, in months. */
export const CHART_MONTHS = 6;
export const DEALS_WINDOW_DAYS = 90;
/** Close reasons that mean a deal was done (`listings_close_reason_check`); withdrawn and mandate-ended are not deals. */
export const DEAL_REASONS = ["let_through_vallo", "let_elsewhere", "let_owner_confirmed", "let_same_property"] as const;

export type AgentInputs = {
  enquiries: EnquiryRow[] | null;
  visits: Visit[] | null;
  closedDeals: number | null;
};

export async function readEnquiries(supabase: unknown, userId: string, now: Date): Promise<EnquiryRow[] | null> {
  try {
    const from = windowStartDay(lagosDay(now), CHART_MONTHS);
    const { data, error } = await (supabase as Loose)
      .from("conversations")
      .select("listing_id, created_at")
      .eq("agent_id", userId)
      .eq("context_kind", "listing")
      .gte("created_at", `${from}T00:00:00+01:00`)
      .order("created_at", { ascending: false })
      .limit(CEILING);
    await reportReadError("read.workspace.agentEnquiries", error);
    if (error || !Array.isArray(data) || data.length >= CEILING) return null;
    return parseEnquiries(data);
  } catch {
    return null;
  }
}

export async function readVisits(supabase: unknown, userId: string, now: Date): Promise<Visit[] | null> {
  try {
    const today = lagosDay(now);
    const from = windowStartDay(today, CHART_MONTHS);
    const to = addDays(today, VISIT_LOOKAHEAD_DAYS);
    const { data, error } = await (supabase as Loose)
      .from("inspection_requests")
      .select("id, slot_at, state, listings(title)")
      .eq("lister_id", userId)
      .in("state", ["CONFIRMED", "COMPLETED"])
      .gte("slot_at", `${from}T00:00:00+01:00`)
      .lte("slot_at", `${to}T23:59:59+01:00`)
      .order("slot_at", { ascending: true })
      .limit(CEILING);
    await reportReadError("read.workspace.agentVisits", error);
    if (error || !Array.isArray(data) || data.length >= CEILING) return null;
    return parseVisits(data);
  } catch {
    return null;
  }
}

export async function readClosedDeals(supabase: unknown, agentId: string, now: Date): Promise<number | null> {
  try {
    const since = new Date(now.getTime() - DEALS_WINDOW_DAYS * 86_400_000).toISOString();
    const { count, error } = await (supabase as Loose)
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .in("close_reason", [...DEAL_REASONS])
      .gte("closed_at", since);
    await reportReadError("read.workspace.agentClosedDeals", error);
    return error || typeof count !== "number" ? null : count;
  } catch {
    return null;
  }
}

export async function readAgentInputs(
  supabase: unknown,
  ids: { userId: string; agentId: string },
  now: Date,
): Promise<AgentInputs> {
  const [enquiries, visits, closedDeals] = await Promise.all([
    readEnquiries(supabase, ids.userId, now),
    readVisits(supabase, ids.userId, now),
    readClosedDeals(supabase, ids.agentId, now),
  ]);
  return { enquiries, visits, closedDeals };
}

/** The featured listing, with real counts. Any count that could not be read is null, never zero. */
export type Featured = {
  listingId: string;
  title: string;
  place: string | null;
  bedrooms: number | null;
  photoUrl: string | null;
  /** Enquiries in the last 30 days, from the enquiry rows. Null when those rows could not be read. */
  enquiries30: number | null;
  /** The last seven days, from `listing_funnel`; null when that read failed. */
  week: { opened: number; enquired: number; booked: number } | null;
};

export async function readFeatured(
  supabase: unknown,
  pick: { listingId: string; enquiries: number } | null,
  enquiriesKnown: boolean,
): Promise<Featured | null> {
  if (!pick) return null;
  const db = supabase as Loose;
  try {
    const [listing, photo, funnel] = await Promise.all([
      db.from("listings").select("id, title, area, city, bedrooms").eq("id", pick.listingId).maybeSingle(),
      db.from("listing_photos").select("storage_path").eq("listing_id", pick.listingId).order("position", { ascending: true }).limit(1),
      db.rpc("listing_funnel", { p_listing: pick.listingId }),
    ]);
    await reportReadError("read.workspace.featuredListing", listing.error, photo.error, funnel.error);
    const row = listing.data as { title?: string; area?: string | null; city?: string | null; bedrooms?: number | null } | null;
    if (listing.error || !row || typeof row.title !== "string") return null;
    const path = !photo.error && Array.isArray(photo.data) ? (photo.data[0] as { storage_path?: string } | undefined)?.storage_path : undefined;
    const read = funnel.error ? null : funnelFrom(funnel.data as FunnelRpcRow[] | null);
    const stage = (key: string) => read?.rows.find((r) => r.stage === key)?.mine ?? null;
    const opened = stage("opened");
    const enquired = stage("enquired");
    const booked = stage("booked");
    return {
      listingId: pick.listingId,
      title: row.title,
      place: [row.area, row.city].filter((p): p is string => typeof p === "string" && p.trim() !== "").join(", ") || null,
      bedrooms: typeof row.bedrooms === "number" ? row.bedrooms : null,
      photoUrl: typeof path === "string" ? photoAddress(path) : null,
      enquiries30: enquiriesKnown ? pick.enquiries : null,
      week: opened !== null && enquired !== null && booked !== null ? { opened, enquired, booked } : null,
    };
  } catch {
    return null;
  }
}
