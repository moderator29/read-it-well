import type { ListingIntent, ListingSearchFilter } from "@/lib/listings/types";
import {
  activeFilterCount,
  clearedFilters,
  parseDiscoveryQuery,
  toFilter,
  toPoolFilter,
  toSearchHref,
  type DiscoveryQuery,
  type RawSearchParams,
  type ViewKey,
} from "@/lib/listings/search-params";

/**
 * The results shelf's query: the address-bar contract plus the market.
 *
 * `DiscoveryQuery` (lib, shared with the other discovery surfaces) carries everything the
 * filter sheet asks except which market a person is in: to let or for sale.
 * The repository and `matchesFacts` both honour `intent` already, so the
 * shelf reads one more parameter, `market`, carries it on every link it
 * builds, and hands it to the same filter the rest of the query becomes.
 * When `DiscoveryQuery` grows an `intent` of its own this file shrinks to a
 * re-export.
 */
export type ShelfQuery = DiscoveryQuery & { intent?: ListingIntent };

export const MARKET_PARAM = "market";

function readMarket(value: string | string[] | undefined): ListingIntent | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "sale" || raw === "buy") return "sale";
  if (raw === "rent") return "rent";
  return undefined;
}

export function parseShelfQuery(params: RawSearchParams): ShelfQuery {
  const query: ShelfQuery = parseDiscoveryQuery(params);
  const intent = readMarket(params[MARKET_PARAM]);
  if (intent !== undefined) query.intent = intent;
  return query;
}

function withMarket(href: string, intent: ListingIntent | undefined): string {
  if (!intent) return href;
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}${MARKET_PARAM}=${intent === "sale" ? "buy" : "rent"}`;
}

export function toShelfHref(query: ShelfQuery): string {
  return withMarket(toSearchHref(query), query.intent);
}

/** The same link with the filter sheet open on arrival. */
export function toShelfFiltersHref(query: ShelfQuery): string {
  const href = toShelfHref(query);
  return `${href}${href.includes("?") ? "&" : "?"}filters=open`;
}

export function toShelfViewHref(query: ShelfQuery, view: ViewKey): string {
  const href = toShelfHref({ ...query, view });
  if (view === "map") return href;
  return href.includes("?") ? `${href}&view=list` : `${href}?view=list`;
}

export function shelfFilter(query: ShelfQuery): ListingSearchFilter {
  const filter = toFilter(query);
  if (query.intent) filter.intent = query.intent;
  return filter;
}

export function shelfPoolFilter(query: ShelfQuery): ListingSearchFilter {
  return toPoolFilter(query);
}

export function shelfActiveCount(query: ShelfQuery): number {
  return activeFilterCount(query) + (query.intent ? 1 : 0);
}

export function clearedShelf(query: ShelfQuery): ShelfQuery {
  const cleared: ShelfQuery = clearedFilters(query);
  delete cleared.kind;
  return cleared;
}
