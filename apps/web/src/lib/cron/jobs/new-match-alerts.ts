import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { loadListingsByIds } from "../../listings/supabase-repository";
import { planAlerts, type AlertCandidate } from "../../saved/search-alerts";
import { asSavedSearches, SAVED_SEARCH_COLUMNS } from "../../saved/searches-db";
import { INSTANT_ALERTS_PER_DAY, lagosDay, splitByQuota } from "../../saved/instant-alerts";
import type { AdminClient } from "../rpc";
import { subjectOf, windowStart } from "./saved-search-alerts";

/**
 * V-15: THE FIVE-MINUTE NEW-MATCH RUN.
 *
 * Publication queues a listing (`listing_match_queue`, written by a trigger on
 * `listings`). This run does nothing at all while the queue is empty, which is
 * almost always, so it costs one indexed read every five minutes. When
 * something is queued it runs THE SAME PLANNER as the morning digest
 * (`planAlerts`) over the same window, applies the three-a-day cap
 * (`splitByQuota`), writes notifications for the people it may tell now (the
 * existing push trigger takes them to a handset under each person's own
 * preferences and quiet hours), moves only their watermarks, and marks the
 * queue rows done. People over the cap keep their watermark, so the 08:40
 * digest tells them everything in one notice.
 *
 * ORDER MATTERS AND IS THE DAILY JOB'S ORDER: notifications first, then the
 * quota, then the watermarks, then the queue. A watermark that moved before
 * its notification was written is a person who is never told; a queue row
 * left open is only a run repeated, which the watermark makes harmless.
 */

const QUEUE_BATCH = 100;
const SEARCH_BATCH = 500;
const MAX_SEARCH_PAGES = 20;
const CANDIDATE_LIMIT = 200;
const SEARCHES_HREF = "/saved/searches";

type Untyped = {
  from: (table: string) => {
    select: (cols: string) => {
      is: (col: string, value: null) => {
        order: (col: string, opts: { ascending: boolean }) => {
          limit: (n: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        };
      };
      eq: (col: string, value: string) => {
        in: (col: string, values: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        gte: (col: string, value: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
    upsert: (rows: unknown[], opts: { onConflict: string }) => PromiseLike<{ error: { message: string } | null }>;
    update: (row: Record<string, unknown>) => {
      in: (col: string, values: string[]) => PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

type WalkTable = {
  from: (table: "match_alert_walk" | "listing_match_queue") => {
    select: (cols: string) => {
      eq: (col: string, value: number) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
    upsert: (rows: unknown[], opts: { onConflict: string }) => PromiseLike<{ error: { message: string } | null }>;
    update: (row: Record<string, unknown>) => {
      in: (col: string, values: string[]) => {
        lte: (col: string, value: string) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
};

export async function newMatchAlerts(admin: AdminClient): Promise<JobVerdict> {
  const now = Date.now();
  const stamp = new Date(now).toISOString();
  const db = admin as unknown as Untyped;

  const { data: queued, error: queueError } = await db
    .from("listing_match_queue")
    .select("listing_id")
    .is("processed_at", null)
    .order("published_at", { ascending: true })
    .limit(QUEUE_BATCH);
  if (queueError) throw new Error(`listing_match_queue: ${queueError.message}`);
  const queueIds = ((queued as { listing_id: string }[] | null) ?? []).map((row) => row.listing_id);
  if (queueIds.length === 0) {
    return { outcome: "ok", counts: { queued: 0, notices: 0 }, detail: { queued: 0 }, alert: null };
  }

  const searches = asSavedSearches(admin);
  const day = lagosDay(now);

  /* People already at today's cap are left out of the page altogether: the
     morning digest tells them, and their searches must not fill the page
     and starve everybody behind them (review, V-15). */
  const { data: capped, error: cappedError } = await db
    .from("match_alert_quota")
    .select("user_id, sent")
    .eq("day", day)
    .gte("sent", INSTANT_ALERTS_PER_DAY);
  if (cappedError) throw new Error(`match_alert_quota: ${cappedError.message}`);
  const overQuota = new Set(((capped as { user_id: string }[] | null) ?? []).map((row) => row.user_id));

  /* Every alerting search, paged BY ID so the walk always moves forward,
     up to MAX_SEARCH_PAGES pages, RESUMING where the last run stopped
     (`match_alert_walk`, review V-15). A run that stops at the cap saves its
     place and leaves the queue open; the run that reaches the end closes the
     pass. */
  const walkDb = admin as unknown as WalkTable;
  const { data: walkRow, error: walkError } = await walkDb
    .from("match_alert_walk")
    .select("after_id, pass_started_at")
    .eq("id", 1)
    .maybeSingle();
  if (walkError) throw new Error(`match_alert_walk: ${walkError.message}`);
  const walk = (walkRow as { after_id: string | null; pass_started_at: string | null } | null) ?? null;
  const passStartedAt = walk?.after_id ? (walk.pass_started_at ?? stamp) : stamp;
  const rows: Parameters<typeof subjectOf>[0][] = [];
  let lastId: string | null = walk?.after_id ?? null;
  let moreSearches = false;
  for (let page = 0; ; page += 1) {
    if (page >= MAX_SEARCH_PAGES) {
      moreSearches = true;
      break;
    }
    let query = searches
      .from("saved_searches")
      .select(SAVED_SEARCH_COLUMNS)
      .eq("alert_enabled", true)
      .order("id", { ascending: true })
      .limit(SEARCH_BATCH);
    if (lastId !== null) query = query.gt("id", lastId);
    const { data: pageRows, error: readError } = await query;
    if (readError) throw new Error(`saved_searches: ${readError.message}`);
    const list = pageRows ?? [];
    for (const row of list) if (!overQuota.has(row.user_id)) rows.push(row);
    if (list.length < SEARCH_BATCH) break;
    lastId = list[list.length - 1]!.id;
  }
  const subjects = rows.map(subjectOf);

  const candidates: AlertCandidate[] = [];
  if (subjects.length > 0) {
    const { data: fresh, error: listingError } = await admin
      .from("listings")
      .select("id, published_at")
      .eq("status", "PUBLISHED")
      .eq("is_demo", false)
      .gt("published_at", windowStart(subjects, now))
      .order("published_at", { ascending: true })
      .limit(CANDIDATE_LIMIT);
    if (listingError) throw new Error(`listings: ${listingError.message}`);
    const published = new Map<string, string>();
    for (const row of fresh ?? []) if (row.published_at) published.set(row.id, row.published_at);
    if (published.size > 0) {
      const listings = await loadListingsByIds(admin, [...published.keys()]);
      for (const [id, publishedAt] of published) {
        const listing = listings.get(id);
        if (listing) candidates.push({ listing, publishedAt });
      }
    }
  }

  const plan = planAlerts(subjects, candidates, SEARCHES_HREF);
  const users = [...new Set(plan.notices.map((notice) => notice.userId))];
  const sentToday = new Map<string, number>();
  if (users.length > 0) {
    const { data: quota, error: quotaError } = await db
      .from("match_alert_quota")
      .select("user_id, sent")
      .eq("day", day)
      .in("user_id", users);
    if (quotaError) throw new Error(`match_alert_quota: ${quotaError.message}`);
    for (const row of (quota as { user_id: string; sent: number }[] | null) ?? []) sentToday.set(row.user_id, row.sent);
  }
  const split = splitByQuota(plan, subjects, sentToday, INSTANT_ALERTS_PER_DAY);

  const counts = {
    queued: queueIds.length,
    unfinished: moreSearches ? 1 : 0,
    searches: subjects.length,
    candidates: candidates.length,
    notices: split.send.length,
    deferred: split.defer.length,
  };

  if (split.send.length > 0) {
    const { error } = await admin.from("notifications").insert(
      split.send.map((notice) => ({
        user_id: notice.userId,
        kind: "listing" as const,
        title: notice.title,
        body: notice.body,
        href: notice.href,
      })),
    );
    if (error) {
      return {
        outcome: "attention",
        counts: { ...counts, notices: 0 },
        detail: { ...counts, reason: "notify_failed" },
        alert: {
          kind: "cron.new_match_alerts.notify_failed",
          severity: "warning",
          detail: { notices: split.send.length, reason: error.message.slice(0, 120) },
        },
      };
    }
    const { error: quotaWrite } = await db.from("match_alert_quota").upsert(
      split.send.map((notice) => ({ user_id: notice.userId, day, sent: (sentToday.get(notice.userId) ?? 0) + 1 })),
      { onConflict: "user_id,day" },
    );
    if (quotaWrite) console.warn(`[cron] new-match-alerts quota: ${quotaWrite.message}`);
  }

  let stuck: string | null = null;
  if (plan.watermark !== null && split.advance.length > 0) {
    const { error } = await searches
      .from("saved_searches")
      .update({ alert_cursor_at: plan.watermark, alert_checked_at: stamp })
      .in("id", split.advance);
    if (error) stuck = error.message;
  }
  if (!stuck && split.matched.length > 0) {
    const { error } = await searches
      .from("saved_searches")
      .update({ alert_notified_at: stamp })
      .in("id", split.matched);
    if (error) stuck = error.message;
  }

  /* Mark the queue done only when every alerting search was read and every
     candidate fitted in one page; otherwise the next run repeats, which the
     watermarks make harmless. */
  const complete = !moreSearches && candidates.length < CANDIDATE_LIMIT;
  const { error: walkWrite } = await walkDb
    .from("match_alert_walk")
    .upsert([{ id: 1, after_id: moreSearches ? lastId : null, pass_started_at: moreSearches ? passStartedAt : null, updated_at: stamp }], {
      onConflict: "id",
    });
  if (walkWrite) console.warn(`[cron] new-match-alerts walk: ${walkWrite.message}`);
  /* Only listings enqueued before this pass began have been seen by every
     page of it. */
  const { error: doneError } = complete
    ? await walkDb
        .from("listing_match_queue")
        .update({ processed_at: stamp })
        .in("listing_id", queueIds)
        .lte("enqueued_at", passStartedAt)
    : { error: null };

  if (stuck || doneError) {
    return {
      outcome: "attention",
      counts,
      detail: { ...counts, reason: stuck ? "watermark_stuck" : "queue_stuck" },
      alert: {
        kind: stuck ? "cron.new_match_alerts.watermark_stuck" : "cron.new_match_alerts.queue_stuck",
        severity: "warning",
        detail: { reason: (stuck ?? doneError?.message ?? "unknown").slice(0, 120) },
      },
    };
  }
  return { outcome: "ok", counts, detail: counts, alert: null };
}
