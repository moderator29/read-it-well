import { matchesFilter } from "../listings/filter";
import type { Listing, ListingSearchFilter } from "../listings/types";
import { parseShelfQuery, shelfFilter, staySideHref } from "@/components/app/search/shelf-query";
import type { SavedSearchParams } from "./searches";
import { countOf } from "@vallo/i18n/core";

/**
 * WHAT COUNTS AS A NEW MATCH, AS A PURE DECISION.
 *
 * The whole of the alert rule is here, with the clock and both reads handed
 * in, so every branch of it is provable at a fixed instant with no database,
 * no key and no request. `lib/cron/jobs/saved-search-alerts.ts` is the two
 * reads, the writes and nothing else.
 *
 * ---------------------------------------------------------------------------
 * THE MATCHER IS THE ONE THE SHELF USES, AND THAT IS THE POINT.
 *
 * `matchesFilter` in `lib/listings/filter.ts` is what discovery judges a row
 * with, in SQL-narrowed form on the server and in the browser for the filter
 * sheet's counts. A second rule here - a hand-written SQL predicate per saved
 * search, say - would be a copy that drifts, and the day it drifted a person
 * would be told about a place their own search does not show them.
 *
 * ---------------------------------------------------------------------------
 * ONE DIFFERENCE FROM THE SHELF, STATED OUT LOUD: `excludeDemo`.
 *
 * The results page shows the example collection, because an empty catalogue
 * looks broken. An alert is not a page somebody chose to open, it is a push
 * into their day claiming a real place went up, so the example rows are
 * excluded here exactly as the assistant and the syndication feed exclude
 * them (`lib/listings/syndication.ts`). The consequence is honest and worth
 * knowing: while the catalogue is examples only, this job matches nothing and
 * says so in its counts rather than manufacturing an alert.
 *
 * ---------------------------------------------------------------------------
 * ONE NOTIFICATION PER PERSON PER RUN.
 *
 * An account may keep thirty searches. Thirty notifications in one morning is
 * not thirty times the service, it is the end of anybody reading any of them.
 * So a run writes at most one row per person: the search with the most new
 * matches when only one matched, and the plain total across their searches
 * when several did. Both numbers are counted from the same matched set in the
 * same run. Nothing is cached, nothing is estimated, and no number appears
 * anywhere that this function did not count.
 */

/** A listing that went up, with the instant it went up. */
export type AlertCandidate = {
  listing: Listing;
  /** ISO. `listings.published_at`, which is what "went up" means. */
  publishedAt: string;
};

/** One saved search the job is judging, flattened. */
export type AlertSubject = {
  id: string;
  userId: string;
  /** The person's name for it, or the sentence derived from its filters. */
  label: string;
  params: SavedSearchParams;
  href: string;
  /** The watermark. Null means the row predates the alert columns. */
  cursorAt: string | null;
  createdAt: string;
};

/** One person's answer for this run. */
export type AlertNotice = {
  userId: string;
  title: string;
  body: string;
  href: string;
  /** How many new places matched, across every search this notice covers. */
  matches: number;
  /** How many of their searches matched. */
  searches: number;
};

export type AlertPlan = {
  notices: AlertNotice[];
  /**
   * The newest instant this run actually read. Every judged search moves here,
   * so nothing between the old watermark and this one can be reported twice.
   * Null when there was nothing new to read at all.
   */
  watermark: string | null;
  /** Search ids whose watermark should move to `watermark`. */
  advance: string[];
  /** Search ids that matched something, so their notified stamp can move. */
  matchedIds: string[];
  /** How many searches matched something, for the run's counts. */
  matchedSearches: number;
  /** How many new listings matched at least one search. */
  matchedListings: number;
  /**
   * Searches saved for a stay category (hotel, shortlet, restaurant) on the
   * Property side, which holds no stays since V-67. They are not judged, so
   * they can never match, and are listed here for the run to report.
   */
  staySide: string[];
};

/** The floor a search is judged from. */
function floorOf(search: AlertSubject): number {
  const at = Date.parse(search.cursorAt ?? search.createdAt);
  return Number.isFinite(at) ? at : 0;
}

/** Where is this saved search, as a question the catalogue answers. */
export function filterFor(params: SavedSearchParams): ListingSearchFilter {
  const filter = shelfFilter(parseShelfQuery(params));
  filter.excludeDemo = true;
  return filter;
}

/** How a notice reads. The count is the caller's count, never a rounding. */
export function noticeCopy(
  matches: number,
  searches: number,
  label: string,
): { title: string; body: string } {
  if (searches === 1) {
    return {
      title: countOf(matches, "newPlacesMatch").replace("{label}", label),
      body: "Opening this search shows everything that matches it now, including these.",
    };
  }
  return {
    title: countOf(matches, "newPlacesMatchSaved"),
    body: `Across ${searches} of your saved searches. Each one opens on its own results.`,
  };
}

/**
 * The run's whole decision.
 *
 * `candidates` are the listings read once for every search, newest last. A
 * search only judges the ones published after its own watermark, so a search
 * saved an hour ago is not told about this morning.
 */
export function planAlerts(
  searches: readonly AlertSubject[],
  candidates: readonly AlertCandidate[],
  searchesHref: string,
): AlertPlan {
  let watermark: string | null = null;
  let watermarkAt = 0;
  for (const candidate of candidates) {
    const at = Date.parse(candidate.publishedAt);
    if (Number.isFinite(at) && at > watermarkAt) {
      watermarkAt = at;
      watermark = candidate.publishedAt;
    }
  }

  const matchedListings = new Set<string>();
  const byUser = new Map<string, { search: AlertSubject; matches: number }[]>();
  const matchedIds: string[] = [];

  const staySide: string[] = [];
  for (const search of searches) {
    if (staySideHref(parseShelfQuery(search.params).kind, {}) !== null) {
      staySide.push(search.id);
      continue;
    }
    const floor = floorOf(search);
    const filter = filterFor(search.params);
    let matches = 0;
    for (const candidate of candidates) {
      const at = Date.parse(candidate.publishedAt);
      if (!Number.isFinite(at) || at <= floor) continue;
      if (!matchesFilter(candidate.listing, filter)) continue;
      matches += 1;
      matchedListings.add(candidate.listing.id);
    }
    if (matches === 0) continue;
    matchedIds.push(search.id);
    const held = byUser.get(search.userId) ?? [];
    held.push({ search, matches });
    byUser.set(search.userId, held);
  }

  const notices: AlertNotice[] = [];
  for (const [userId, hits] of byUser) {
    const total = hits.reduce((sum, hit) => sum + hit.matches, 0);
    // Most matches first, so a single-search notice names the busiest one.
    const sorted = [...hits].sort((a, b) => b.matches - a.matches);
    const lead = sorted[0]!;
    const copy = noticeCopy(total, sorted.length, lead.search.label);
    notices.push({
      userId,
      title: copy.title,
      body: copy.body,
      href: sorted.length === 1 ? lead.search.href : searchesHref,
      matches: total,
      searches: sorted.length,
    });
  }

  const advance =
    watermark === null
      ? []
      : searches.filter((search) => floorOf(search) < watermarkAt).map((search) => search.id);

  return {
    notices,
    watermark,
    advance,
    matchedIds,
    matchedSearches: matchedIds.length,
    matchedListings: matchedListings.size,
    staySide,
  };
}
