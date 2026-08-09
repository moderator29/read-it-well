import type { DiscoveryQuery } from "./search-params";
import { toSearchHref } from "./search-params";
import type { Listing, ListingKind } from "./types";

/**
 * Stated intent, applied to discovery.
 *
 * `profiles.interests` holds what somebody said they came here for, in the
 * same `property_type` words the catalogue is filed under. This module is the
 * only place that decides what that entitles it to do, and the answer is
 * deliberately small.
 *
 * WHAT IT DOES: reorders the default result set so the markets somebody named
 * are the ones they see first.
 *
 * WHAT IT NEVER DOES: remove a listing. Nothing is filtered out, no count
 * changes, and every place that matched the request is still on the page in
 * the same position relative to its own group. A stated interest is a hint
 * about attention, not a claim that the rest of the catalogue is unwanted, and
 * a personalisation that quietly hides inventory is how a marketplace stops
 * being one.
 *
 * WHEN IT APPLIES: only when the address bar is bare. `search-params.ts` is
 * the URL contract and `toSearchHref` is its serialiser, so "the person has
 * asked for something specific" has one definition here and it is the same one
 * every link on the page writes: if the request round-trips to `/search` with
 * no query string, nothing has been asked for and the default view is ours to
 * order. A search term, a category, a sort, the map, a budget, a bedroom count,
 * an amenity, instant book, verified only - any single one of them and this
 * module returns the results untouched.
 *
 * That rule is the whole difference between personalisation and hijacking. An
 * explicit choice always outranks a remembered one, and it is checked here
 * rather than trusted to each call site.
 *
 * This module imports nothing server-only. It is pure, it is where the rule
 * lives, and it can be exercised without a database.
 */

/** True when the request carries anything the person chose themselves. */
export function hasOwnRequest(query: DiscoveryQuery): boolean {
  return toSearchHref(query) !== "/search";
}

/**
 * Matching kinds first, everything else after, order preserved inside both.
 *
 * A stable partition rather than a sort: the repository's own order is
 * meaningful (featured before the rest, newest before older) and a comparator
 * that only knows about intent would scramble it. Partitioning moves whole groups and leaves the ranking
 * within each group exactly as it arrived.
 *
 * Returns the SAME array instance when there is nothing to do - no intent, an
 * empty page, or nothing on the page matching - so a caller can tell that
 * nothing was applied by identity alone.
 */
export function orderByStatedIntent<T extends { kind: ListingKind }>(
  listings: T[],
  intent: readonly ListingKind[],
): T[] {
  if (intent.length === 0 || listings.length === 0) return listings;

  const wanted = new Set<ListingKind>(intent);
  const first: T[] = [];
  const rest: T[] = [];
  for (const listing of listings) {
    (wanted.has(listing.kind) ? first : rest).push(listing);
  }
  // Nothing on this page answers the stated intent, or everything does. Either
  // way the partition is the input, so hand back the input.
  if (first.length === 0 || rest.length === 0) return listings;
  return [...first, ...rest];
}

/**
 * The kinds actually represented in a result set, in the order they were asked
 * for. This is what the page says out loud, so it can only name markets that
 * are genuinely on the screen: telling somebody their villas came first when
 * the catalogue holds none would be a boast about nothing.
 */
export function intentKindsPresent(
  listings: readonly Listing[],
  intent: readonly ListingKind[],
): ListingKind[] {
  const present = new Set<ListingKind>(listings.map((l) => l.kind));
  return intent.filter((kind) => present.has(kind));
}
