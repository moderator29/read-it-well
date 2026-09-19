import "server-only";

import { resolveSession } from "../actions/session";
import {
  asSavedSearches,
  SAVED_SEARCH_COLUMNS,
  type SavedSearchRow,
} from "./searches-db";
import {
  SAVED_SEARCH_LIMIT,
  describeSearch,
  readStoredSearch,
  type SavedSearchView,
} from "./searches";

/**
 * Read side of the saved searches.
 *
 * Every read here runs through the caller's OWN client, so the rows that come
 * back are the rows `saved_searches_own` lets them see and nothing else. There
 * is no `user_id` predicate doing the security work: the `eq` on the list read
 * is there so the query uses `saved_searches_user_idx`, and if it were deleted
 * the policy would still return exactly the same rows. That is the difference
 * between a filter and a permission, and this file only has the first.
 *
 * A signed-out reader gets an empty list rather than an error, and so does an
 * unconfigured platform: this is a surface with other things on it, and the
 * screen draws its own signed-out state from the session it resolves itself.
 *
 * NOTHING IS CACHED. The list screen and the control on the shelf both read at
 * request time, which is the half of the ONE LAW that a saved-search feature
 * usually drops: the control has to say "saved" after a reload because a row
 * exists, not because a tap set some state a minute ago.
 */

/** How many rows one page reads. One more than the limit, to see an overflow. */
const ROW_LIMIT = SAVED_SEARCH_LIMIT + 1;

/** One row as every surface reads it. Derives the label when nobody named it. */
export function toSavedSearchView(row: SavedSearchRow): SavedSearchView {
  const canonical = readStoredSearch(row.query);
  const named = (row.label ?? "").trim();
  return {
    id: row.id,
    label: named.length > 0 ? named : describeSearch(canonical.params),
    derivedLabel: named.length === 0,
    params: canonical.params,
    href: canonical.href,
    /* The key is recomputed from the stored parameters rather than read from
       `query_key`, so a row whose column and whose jsonb ever disagree is read
       as what it actually holds. The column is the uniqueness constraint; the
       jsonb is the search. */
    key: canonical.key,
    alertEnabled: row.alert_enabled,
    createdAt: row.created_at,
  };
}

/** What a surface needs to know before it draws anything. */
export type SavedSearchesState =
  | { state: "signed-out" }
  | { state: "unconfigured" }
  | { state: "unavailable" }
  | { state: "signed-in"; searches: SavedSearchView[] };

/** Every saved search this account keeps, newest first. */
export async function listSavedSearches(): Promise<SavedSearchesState> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data, error } = await asSavedSearches(session.supabase)
    .from("saved_searches")
    .select(SAVED_SEARCH_COLUMNS)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  /* A read that failed is not an empty shortlist, and drawing the empty state
     over a broken read is how a person is told their saved work is gone when
     it is not. The screen draws its error state instead. */
  if (error || !data) return { state: "unavailable" };

  return { state: "signed-in", searches: data.map(toSavedSearchView) };
}

/** Whether this exact search is already kept, for the control on the shelf. */
export type SavedSearchMatch =
  | { state: "signed-out" }
  | { state: "unconfigured" }
  | { state: "unavailable" }
  | { state: "signed-in"; saved: SavedSearchView | null; total: number };

/**
 * THE READ-BACK. The control on the results shelf draws itself from this and
 * from nothing else, so a reload lands on the truth: a row exists, or it does
 * not.
 *
 * `total` comes back from the same read rather than from a second count
 * query, because the one number the control may show is how full the account's
 * list is and a separately cached count is exactly the disagreement this build
 * keeps finding (a badge and the tab beneath it saying different things).
 */
export async function findSavedSearch(key: string): Promise<SavedSearchMatch> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return { state: "unconfigured" };
  if (session.state === "signed-out") return { state: "signed-out" };

  const { data, error } = await asSavedSearches(session.supabase)
    .from("saved_searches")
    .select(SAVED_SEARCH_COLUMNS)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (error || !data) return { state: "unavailable" };

  const views = data.map(toSavedSearchView);
  return {
    state: "signed-in",
    saved: views.find((view) => view.key === key) ?? null,
    total: views.length,
  };
}
