import type { ListingIntent, ListingKind, ListingSearchFilter } from "@/lib/listings/types";
import { rentMeansTenancy } from "@/lib/listings/filter";
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
 * `DiscoveryQuery` (lib, not this worker's to edit) carries everything the
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

/*
 * THE PROPERTY SHELF HOLDS NO STAYS (V-67). `/search` is the Property side's
 * shelf, and a Wuse shortlet, an Ikeja hotel room and a table used to open it.
 * Both the results and the pool the drawer counts against carry
 * `propertySide`, so the drawer never offers a kind or a price the shelf will
 * not show.
 */
export function shelfFilter(query: ShelfQuery): ListingSearchFilter {
  const filter = toFilter(query);
  if (query.intent) filter.intent = query.intent;
  filter.propertySide = true;
  /* V-65: an upfront limit carried into another market by a link is dropped,
     not applied strictly to listings that have no upfront demand at all. */
  if (filter.maxUpfrontMonths !== undefined && !rentMeansTenancy(filter)) delete filter.maxUpfrontMonths;
  return filter;
}

export function shelfPoolFilter(query: ShelfQuery): ListingSearchFilter {
  return { ...toPoolFilter(query), propertySide: true };
}

/**
 * Where a stay category typed on the Property side belongs (V-67), or null.
 * Hotels and shortlets are the Stays side's search, with the same words;
 * restaurants have their own shelf.
 */
export function staySideHref(kind: ListingKind | undefined, q: string | undefined): string | null {
  if (kind === "restaurant") return "/restaurants";
  if (kind !== "hotel" && kind !== "shortlet") return null;
  const params = new URLSearchParams({ type: kind });
  if (q) params.set("q", q);
  return `/stays/search?${params.toString()}`;
}

export function shelfActiveCount(query: ShelfQuery): number {
  return activeFilterCount(query) + (query.intent ? 1 : 0);
}

export function clearedShelf(query: ShelfQuery): ShelfQuery {
  const cleared: ShelfQuery = clearedFilters(query);
  delete cleared.kind;
  return cleared;
}
