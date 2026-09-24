import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { loadListingsByIds } from "../../listings/supabase-repository";
import {
  planAlerts,
  type AlertCandidate,
  type AlertSubject,
} from "../../saved/search-alerts";
import { readStoredSearch, describeSearch } from "../../saved/searches";
import {
  asSavedSearches,
  SAVED_SEARCH_COLUMNS,
  type SavedSearchRow,
} from "../../saved/searches-db";
import type { AdminClient } from "../rpc";

/**
 * THE SAVED SEARCH ALERT, AND WHAT IT COSTS.
 *
 * A person keeps a hunt. Something goes up that fits it. They are told. The
 * obvious shape is a cron job that re-runs every saved search on a schedule,
 * and that is what this is, so the cost is worth stating plainly rather than
 * discovering later:
 *
 *   TWO READS PER RUN, NOT TWO PER SEARCH. The listings that went up since the
 *   oldest watermark in the batch are read ONCE (one indexed query, capped),
 *   resolved to cards ONCE through `loadListingsByIds`, and then every saved
 *   search is judged against that one set in memory. Five hundred saved
 *   searches and forty new listings is two queries and twenty thousand cheap
 *   comparisons, not five hundred queries. A per-search SQL query would have
 *   been the naive shape and it scales with the product's success, which is
 *   the worst direction for a cost to scale in.
 *
 *   TWO WRITES PER RUN. One notification insert for everybody who matched, one
 *   or two updates to move the stamps. Not one round trip per row.
 *
 *   THE WINDOW IS BOUNDED. `MAX_LOOKBACK_DAYS` stops one neglected row from
 *   dragging the whole back catalogue into a single run, and the candidate cap
 *   bounds the read. A search whose watermark is older than the window is
 *   caught UP to the window rather than posted the intervening month, which is
 *   the honest behaviour for a note about what is new.
 *
 * ---------------------------------------------------------------------------
 * IT USES THE WRAPPER, THE AUDIT ROW AND THE ALERTING THAT ALREADY EXIST.
 *
 * `lib/cron/run.ts` carries the bearer guard, the 503 when the service key is
 * missing, the catch-all and the envelope; `lib/cron/report.ts` writes the one
 * `audit_log` row per run and raises the alert a failed or attention run
 * deserves; `lib/cron/freshness.ts` notices when this job STOPS firing, which
 * is the only failure none of the others can see, and `saved-search-alerts` is
 * registered there beside the other five.
 *
 * ---------------------------------------------------------------------------
 * A FAILED NOTIFICATION DOES NOT MOVE A WATERMARK.
 *
 * If the notification insert fails, the run returns attention and leaves every
 * stamp where it was, so the next run judges the same window again and the
 * person is told late rather than never. The stamps move only after the rows
 * they describe are written.
 */

/** How many alerting searches one run judges. */
const SEARCH_BATCH = 500;

/** How many newly published listings one run reads. */
const CANDIDATE_LIMIT = 200;

/** The oldest a watermark may drag the window back. */
const MAX_LOOKBACK_DAYS = 30;

const DAY_MS = 86_400_000;

/** `public.notifications.kind` for a place going up. */
const NOTIFICATION_KIND = "listing" as const;

/** Where a notice points when several of one person's searches matched. */
const SEARCHES_HREF = "/saved/searches";

export function subjectOf(row: SavedSearchRow): AlertSubject {
  const canonical = readStoredSearch(row.query);
  const named = (row.label ?? "").trim();
  return {
    id: row.id,
    userId: row.user_id,
    label: named.length > 0 ? named : describeSearch(canonical.params),
    params: canonical.params,
    href: canonical.href,
    cursorAt: row.alert_cursor_at,
    createdAt: row.created_at,
  };
}

/** The oldest instant this run has to look back to, floored by the window. */
export function windowStart(subjects: readonly AlertSubject[], now: number): string {
  const floor = now - MAX_LOOKBACK_DAYS * DAY_MS;
  let oldest = now;
  for (const subject of subjects) {
    const at = Date.parse(subject.cursorAt ?? subject.createdAt);
    if (Number.isFinite(at) && at < oldest) oldest = at;
  }
  return new Date(Math.max(floor, oldest)).toISOString();
}

export async function savedSearchAlerts(admin: AdminClient): Promise<JobVerdict> {
  const now = Date.now();
  const stamp = new Date(now).toISOString();
  const searches = asSavedSearches(admin);

  /* Every search with its alert on, oldest watermark first, so a run that hits
     the batch ceiling catches up the most neglected rows rather than the same
     five hundred every time. The service role is used deliberately: this is
     the one reader that is nobody's session, and it is reading rows belonging
     to everybody. It writes nothing it did not read. */
  const { data: rows, error: readError } = await searches
    .from("saved_searches")
    .select(SAVED_SEARCH_COLUMNS)
    .eq("alert_enabled", true)
    .order("alert_cursor_at", { ascending: true, nullsFirst: true })
    .limit(SEARCH_BATCH);
  if (readError) throw new Error(`saved_searches: ${readError.message}`);

  const subjects = (rows ?? []).map(subjectOf);
  if (subjects.length === 0) {
    return {
      outcome: "ok",
      counts: { searches: 0, candidates: 0, matched_searches: 0, notices: 0 },
      detail: { searches: 0, candidates: 0, notices: 0 },
      alert: null,
    };
  }

  /* The listings that went up in the window. `is_demo` is pushed down here and
     judged again by the matcher: the example collection is never the subject
     of an alert (see lib/saved/search-alerts.ts for why). */
  const since = windowStart(subjects, now);
  const { data: fresh, error: listingError } = await admin
    .from("listings")
    .select("id, published_at")
    .eq("status", "PUBLISHED")
    .eq("is_demo", false)
    .gt("published_at", since)
    .order("published_at", { ascending: true })
    .limit(CANDIDATE_LIMIT);
  if (listingError) throw new Error(`listings: ${listingError.message}`);

  const published = new Map<string, string>();
  for (const row of fresh ?? []) {
    if (row.published_at) published.set(row.id, row.published_at);
  }

  const candidates: AlertCandidate[] = [];
  if (published.size > 0) {
    const listings = await loadListingsByIds(admin, [...published.keys()]);
    for (const [id, publishedAt] of published) {
      const listing = listings.get(id);
      if (listing) candidates.push({ listing, publishedAt });
    }
  }

  const plan = planAlerts(subjects, candidates, SEARCHES_HREF);

  const counts = {
    searches: subjects.length,
    candidates: candidates.length,
    matched_searches: plan.matchedSearches,
    matched_listings: plan.matchedListings,
    notices: plan.notices.length,
  };

  /* The notifications first, then the stamps, in that order and never the
     other way round: a stamp that moved before its notification was written is
     a person who is never told. */
  if (plan.notices.length > 0) {
    const { error } = await admin.from("notifications").insert(
      plan.notices.map((notice) => ({
        user_id: notice.userId,
        kind: NOTIFICATION_KIND,
        title: notice.title,
        body: notice.body,
        href: notice.href,
      })),
    );
    if (error) {
      return {
        outcome: "attention",
        counts: { ...counts, notices: 0 },
        detail: { ...counts, written: 0, reason: "notify_failed" },
        alert: {
          // Nothing was lost: no stamp moved, so the next run judges the same
          // window and tells the same people. Late, not never.
          kind: "cron.saved_search_alerts.notify_failed",
          severity: "warning",
          detail: { notices: plan.notices.length, reason: error.message.slice(0, 120) },
        },
      };
    }
  }

  const ids = subjects.map((subject) => subject.id);
  const { error: checkedError } = await searches
    .from("saved_searches")
    .update({ alert_checked_at: stamp })
    .in("id", ids);

  let cursorError: { message: string } | null = null;
  if (plan.watermark !== null && plan.advance.length > 0) {
    const { error } = await searches
      .from("saved_searches")
      .update({ alert_cursor_at: plan.watermark })
      .in("id", plan.advance);
    cursorError = error;
  }
  if (!cursorError && plan.matchedIds.length > 0) {
    const { error } = await searches
      .from("saved_searches")
      .update({ alert_notified_at: stamp })
      .in("id", plan.matchedIds);
    cursorError = error;
  }

  if (checkedError || cursorError) {
    /* The people were told and the watermark did not move, so the next run
       will tell them again. That is a duplicate rather than a silence, and a
       duplicate is the failure a person can see, so the desk hears about it. */
    return {
      outcome: "attention",
      counts,
      detail: { ...counts, reason: "watermark_stuck" },
      alert: {
        kind: "cron.saved_search_alerts.watermark_stuck",
        severity: "warning",
        detail: {
          notices: plan.notices.length,
          reason: (checkedError ?? cursorError)?.message.slice(0, 120) ?? "unknown",
        },
      },
    };
  }

  return { outcome: "ok", counts, detail: counts, alert: null };
}
