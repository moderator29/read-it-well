import type { Listing, ListingKind, ListingSearchFilter } from "./types";

/**
 * Filter and ranking semantics shared by every listing source.
 *
 * The seed catalogue and the Supabase catalogue must answer the same question
 * the same way, otherwise a blended result set would filter differently
 * depending on which half a listing came from. Both sources import these two
 * functions, so there is exactly one definition of "matches this search" and
 * one definition of "a good recommendation rail" in the codebase.
 */

/** Case-insensitive haystack for free text matching. */
export function haystack(l: Listing): string {
  return `${l.title} ${l.area} ${l.city} ${l.state} ${l.kind}`.toLowerCase();
}

/**
 * The one filter rule: category must match when asked for, free text must
 * appear somewhere in the haystack. Identical to the behaviour discovery has
 * had since the seed catalogue was written.
 */
export function matchesFilter(l: Listing, filter: ListingSearchFilter = {}): boolean {
  if (filter.kind && l.kind !== filter.kind) return false;
  const q = filter.q?.trim().toLowerCase();
  if (q && !haystack(l).includes(q)) return false;
  return true;
}

/**
 * Highest rated first, but never two of the same category in a row while an
 * alternative exists, so the rail reads as a tour of the catalogue.
 */
export function diversePick(listings: Listing[], limit: number): Listing[] {
  const pool = [...listings].sort(
    (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  );
  const out: Listing[] = [];
  while (out.length < limit && pool.length > 0) {
    const prev: ListingKind | undefined = out[out.length - 1]?.kind;
    const idx = pool.findIndex((l) => l.kind !== prev);
    const pick = pool.splice(idx === -1 ? 0 : idx, 1)[0];
    if (!pick) break;
    out.push(pick);
  }
  return out;
}
