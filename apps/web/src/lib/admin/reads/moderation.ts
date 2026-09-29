import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../supabase/database.types";
import { requireAdmin } from "../guard";
import { lagosDayEnd, lagosDayStart, pageRange, takePage, type AdminQueueFilter } from "../queue-filter";

/**
 * The moderation desk's own reads. READ ONLY, through the admin's RLS-bound
 * client (`reports_admin_all`, `posts_admin_write`, `stories_admin_write`,
 * `story_comments_admin_write`, `social_profiles_admin_write`,
 * `profiles_select_admin`); never the service role.
 *
 * Every total is a head-only exact count. The two series (new per day,
 * response times) read every row in a fourteen-day window, a thousand at a
 * time until it is exhausted, so neither is a sample of a capped list.
 */

type Db = SupabaseClient<Database>;
export type Read<T> = { state: "ok"; data: T } | { state: "unavailable" };
const UNAVAILABLE = { state: "unavailable" } as const;
const DAY = 86_400_000;
const PAGE = 1000;

/** The categories `reports_category_chk` allows, plus rows filed before categories existed. */
export const REPORT_CATEGORIES = [
  "off_platform_payment",
  "scam",
  "unsafe",
  "not_as_described",
  "unavailable",
  "offensive",
  "duplicate",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number] | "uncategorised";

async function adminDb(): Promise<Db | null> {
  const access = await requireAdmin("moderation");
  return access.state === "admin" ? access.supabase : null;
}

export type ModerationSummary = {
  openReports: number;
  reviewingReports: number;
  held: { posts: number; stories: number; comments: number; bios: number; events: number };
  olderThan24h: { reports: number; held: number };
  /** Reports still waiting (open or in review), by category. */
  byCategory: Record<ReportCategory, number>;
  medianResponseMinutes: { thisWeek: number | null; lastWeek: number | null };
  closedThisWeek: number;
  newThisWeek: number;
  newLastWeek: number;
  /** New reports per Lagos day, fourteen days, oldest first. */
  newPerDay: number[];
};

type CountQuery = PromiseLike<{ count: number | null; error: unknown }>;

async function count(query: CountQuery): Promise<number> {
  const { count: n, error } = await query;
  if (error) throw error;
  return n ?? 0;
}

export async function getModerationSummary(now: number = Date.now()): Promise<Read<ModerationSummary>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const dayAgo = new Date(now - DAY).toISOString();
  const weekAgo = new Date(now - 7 * DAY).toISOString();
  const fortnightAgo = new Date(now - 14 * DAY).toISOString();
  const head = { count: "exact" as const, head: true };
  const waitingStatuses = ["open", "reviewing"] as const;

  try {
    const [
      openReports,
      reviewingReports,
      posts,
      stories,
      comments,
      bios,
      events,
      oldReports,
      oldPosts,
      oldStories,
      oldComments,
      oldBios,
      oldEvents,
      newThisWeek,
      newLastWeek,
      ...categoryCounts
    ] = await Promise.all([
      count(db.from("reports").select("id", head).eq("status", "open")),
      count(db.from("reports").select("id", head).eq("status", "reviewing")),
      count(db.from("posts").select("id", head).eq("status", "HELD")),
      count(db.from("stories").select("id", head).eq("status", "HELD")),
      count(db.from("story_comments").select("id", head).eq("status", "HELD")),
      count(db.from("social_profiles").select("user_id", head).eq("bio_status", "HELD")),
      count(db.from("events").select("id", head).eq("status", "HELD")),
      count(db.from("reports").select("id", head).in("status", [...waitingStatuses]).lt("created_at", dayAgo)),
      count(db.from("posts").select("id", head).eq("status", "HELD").lt("created_at", dayAgo)),
      count(db.from("stories").select("id", head).eq("status", "HELD").lt("created_at", dayAgo)),
      count(db.from("story_comments").select("id", head).eq("status", "HELD").lt("created_at", dayAgo)),
      count(db.from("social_profiles").select("user_id", head).eq("bio_status", "HELD").lt("updated_at", dayAgo)),
      count(db.from("events").select("id", head).eq("status", "HELD").lt("created_at", dayAgo)),
      count(db.from("reports").select("id", head).gte("created_at", weekAgo)),
      count(db.from("reports").select("id", head).gte("created_at", fortnightAgo).lt("created_at", weekAgo)),
      ...REPORT_CATEGORIES.map((category) =>
        count(db.from("reports").select("id", head).in("status", [...waitingStatuses]).eq("category", category)),
      ),
      count(db.from("reports").select("id", head).in("status", [...waitingStatuses]).is("category", null)),
    ]);

    const created: string[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("reports")
        .select("created_at")
        .gte("created_at", fortnightAgo)
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) created.push(row.created_at);
      if (!data || data.length < PAGE) break;
    }

    const closed: { createdAt: string; resolvedAt: string }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("reports")
        .select("created_at, resolved_at")
        .in("status", ["resolved", "dismissed"])
        .gte("resolved_at", fortnightAgo)
        .order("resolved_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      for (const row of data ?? []) {
        if (row.resolved_at) closed.push({ createdAt: row.created_at, resolvedAt: row.resolved_at });
      }
      if (!data || data.length < PAGE) break;
    }

    const byCategory = Object.fromEntries(
      [...REPORT_CATEGORIES, "uncategorised" as const].map((category, index) => [
        category,
        categoryCounts[index] ?? 0,
      ]),
    ) as Record<ReportCategory, number>;
    const response = responseTimes(closed, now);

    return {
      state: "ok",
      data: {
        openReports,
        reviewingReports,
        held: { posts, stories, comments, bios, events },
        olderThan24h: { reports: oldReports, held: oldPosts + oldStories + oldComments + oldBios + oldEvents },
        byCategory,
        medianResponseMinutes: { thisWeek: response.thisWeek, lastWeek: response.lastWeek },
        closedThisWeek: response.closedThisWeek,
        newThisWeek,
        newLastWeek,
        newPerDay: perLagosDay(created, 14, now),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/** Pure: median minutes from filing to closing, this week and last. */
export function responseTimes(
  rows: readonly { createdAt: string; resolvedAt: string }[],
  now: number,
): { thisWeek: number | null; lastWeek: number | null; closedThisWeek: number } {
  const thisWeek: number[] = [];
  const lastWeek: number[] = [];
  for (const row of rows) {
    const created = Date.parse(row.createdAt);
    const resolved = Date.parse(row.resolvedAt);
    if (Number.isNaN(created) || Number.isNaN(resolved) || resolved < created) continue;
    const age = now - resolved;
    if (age < 0) continue;
    const minutes = (resolved - created) / 60_000;
    if (age <= 7 * DAY) thisWeek.push(minutes);
    else if (age <= 14 * DAY) lastWeek.push(minutes);
  }
  return { thisWeek: middle(thisWeek), lastWeek: middle(lastWeek), closedThisWeek: thisWeek.length };
}

function middle(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** Pure: stamps counted per Lagos calendar day, `days` long, oldest first. */
export function perLagosDay(stamps: readonly string[], days: number, now: number): number[] {
  const LAGOS = 60 * 60_000;
  const today = Math.floor((now + LAGOS) / DAY);
  const out = new Array<number>(days).fill(0);
  for (const stamp of stamps) {
    const at = Date.parse(stamp);
    if (Number.isNaN(at)) continue;
    const index = days - 1 - (today - Math.floor((at + LAGOS) / DAY));
    if (index >= 0 && index < days) out[index] = (out[index] ?? 0) + 1;
  }
  return out;
}

/* ------------------------------------------------------------ by reason */

export type CategoryReport = {
  id: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  category: string | null;
  reason: string;
  status: Database["public"]["Enums"]["report_status"];
  createdAt: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
};

/**
 * Reports narrowed by category IN THE QUERY, paged forty at a time, with the
 * same search, status and date narrowing as `getReports` (which
 * has no category filter). `category` of "uncategorised" means rows filed
 * before categories existed.
 */
export async function getReportsByCategory(
  category: ReportCategory,
  filter?: AdminQueueFilter,
): Promise<Read<{ rows: CategoryReport[]; full: boolean }>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  const page = pageRange(filter);
  const term = (filter?.q ?? "").trim();
  try {
    let select = db
      .from("reports")
      .select("id, reporter_id, target_type, target_id, category, reason, status, created_at, resolved_at, resolved_by");
    select = category === "uncategorised" ? select.is("category", null) : select.eq("category", category);
    if (term.length > 0) select = select.ilike("reason", `%${term}%`);
    if (filter?.from) select = select.gte("created_at", lagosDayStart(filter.from));
    if (filter?.to) select = select.lte("created_at", lagosDayEnd(filter.to));
    const { data, error } = await select
      .order("created_at", { ascending: false })
      .range(page.from, page.to);
    if (error) return UNAVAILABLE;
    const { rows, full } = takePage(data ?? []);
    const ids = [
      ...new Set(rows.flatMap((row) => [row.reporter_id, row.resolved_by]).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: people } = await db.from("profiles").select("id, display_name").in("id", ids);
      for (const person of people ?? []) if (person.display_name) names.set(person.id, person.display_name);
    }
    return {
      state: "ok",
      data: {
        full,
        rows: rows.map((row) => ({
          id: row.id,
          reporterName: names.get(row.reporter_id) ?? "A Vallo member",
          targetType: row.target_type,
          targetId: row.target_id,
          category: row.category,
          reason: row.reason,
          status: row.status,
          createdAt: row.created_at,
          resolvedAt: row.resolved_at,
          resolvedByName: row.resolved_by ? (names.get(row.resolved_by) ?? null) : null,
        })),
      },
    };
  } catch {
    return UNAVAILABLE;
  }
}

/* ------------------------------------------------------------ held events */

export type HeldEvent = {
  id: string;
  title: string;
  blurb: string | null;
  venue: string | null;
  startsAt: string | null;
  holdReason: string | null;
  createdAt: string;
  hostName: string | null;
};

/**
 * Every event the safety scan is holding (`private.scan_event` sets
 * `status = 'HELD'` on payment language or an account number), oldest first,
 * read whole a thousand at a time. `events_admin_write` lets an admin read
 * them. There is no decision for a held event in the admin actions yet
 * (`decideHeldItem` takes posts, stories, comments and bios), and the desk
 * says so under each held event.
 */
export async function getHeldEvents(): Promise<Read<HeldEvent[]>> {
  const db = await adminDb();
  if (!db) return UNAVAILABLE;
  try {
    const rows: {
      id: string;
      title: string;
      blurb: string | null;
      venue_label: string | null;
      starts_at: string | null;
      hold_reason: string | null;
      created_at: string;
      host_id: string;
    }[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("events")
        .select("id, title, blurb, venue_label, starts_at, hold_reason, created_at, host_id")
        .eq("status", "HELD")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) return UNAVAILABLE;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    const hosts = [...new Set(rows.map((row) => row.host_id))];
    const names = new Map<string, string>();
    if (hosts.length > 0) {
      const { data } = await db.from("profiles").select("id, display_name").in("id", hosts);
      for (const person of data ?? []) if (person.display_name) names.set(person.id, person.display_name);
    }
    return {
      state: "ok",
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        blurb: row.blurb,
        venue: row.venue_label,
        startsAt: row.starts_at,
        holdReason: row.hold_reason,
        createdAt: row.created_at,
        hostName: names.get(row.host_id) ?? null,
      })),
    };
  } catch {
    return UNAVAILABLE;
  }
}
