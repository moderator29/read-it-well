import { parseShelfQuery, shelfFilter } from "@/components/app/search/shelf-query";
import type { SavedSearchParams } from "@/lib/saved/searches";
import type { SavedSearchSignal } from "./best-matches";

/**
 * A saved search, as Best matches reads it: the very filter the search
 * returns when it is opened (`shelfFilter(parseShelfQuery(...))`, the same
 * pair the shelf and the saved-search alerts use), whether it named a place,
 * and its budget ceiling. So "like your saved search" on a card can never
 * describe a home that search would not show.
 */
export function savedSearchSignal(params: SavedSearchParams): SavedSearchSignal {
  const query = parseShelfQuery(params);
  return {
    filter: shelfFilter(query),
    namesPlace: Boolean(query.q?.trim()) || (query.areas?.length ?? 0) > 0,
    ...(query.maxMinor !== undefined ? { maxMinor: query.maxMinor } : {}),
  };
}
