import type { ListingIntent, ListingKind, ListingSearchFilter } from "@/lib/listings/types";
import { rentMeansTenancy } from "@/lib/listings/filter";
/* The parameter NAMES only, from the zod-free half of the stays contract:
   importing `staysParamsSchema` for its `.shape` put zod into the filter
   drawer's graph and so into the first load of /search. */
import { STAYS_PARAM_KEYS } from "@/lib/stays/query";
import type { ParsedWords } from "@/lib/listings/query-parse";
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
  /* Instant book is a stay's question, and the Property side has none: an old
     link's `instant=1` is not read here (V-67 review). */
  query.instantBook = false;
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
  if (view !== "list") return href;
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

/* What the Stays search reads, minus the money and the order: a yearly
   budget or a property sort key does not mean the same thing per night. */
const STAYS_CARRIED = STAYS_PARAM_KEYS.filter(
  (key) => key !== "min" && key !== "max" && key !== "sort",
);

/**
 * Where a stay category typed on the Property side belongs (V-67), or null.
 * Hotels and shortlets are the Stays side's search, carrying every parameter
 * that search reads (`STAYS_PARAM_KEYS`, the schema's own keys) apart from the budget and the sort.
 * Restaurants go to `/restaurants`, which reads no parameters at all, so
 * nothing is carried there.
 */
export function staySideHref(kind: ListingKind | undefined, raw: RawSearchParams): string | null {
  if (kind === "restaurant") return "/restaurants";
  if (kind !== "hotel" && kind !== "shortlet") return null;
  const params = new URLSearchParams({ type: kind });
  for (const key of STAYS_CARRIED) {
    const value = raw[key];
    const one = Array.isArray(value) ? value[0] : value;
    if (typeof one === "string" && one.trim() !== "") params.set(key, one);
  }
  return `/stays/search?${params.toString()}`;
}

/**
 * The search box's words, read into filters (V-66). What the person typed
 * wins over what the address already held, because they just said it; shapes
 * and areas are added to, and the text left is only what was not read.
 */
export function applyWords(query: ShelfQuery, words: ParsedWords): ShelfQuery {
  const next: ShelfQuery = { ...query };
  delete next.q;
  if (words.rest) next.q = words.rest;
  if (words.bedrooms !== undefined) next.bedrooms = words.bedrooms;
  if (words.maxMinor !== undefined) next.maxMinor = words.maxMinor;
  if (words.minMinor !== undefined) next.minMinor = words.minMinor;
  if (words.intent) next.intent = words.intent;
  if (words.ownerDirect && !next.listerRoles.includes("owner")) next.listerRoles = [...next.listerRoles, "owner"];
  if (words.shapes.length > 0) next.shapes = [...new Set([...(next.shapes ?? []), ...words.shapes])];
  if (words.withBq) next.withBq = true;
  if (words.serviced) next.servicedOnly = true;
  if (words.areas.length > 0) next.areas = [...new Set([...(next.areas ?? []), ...words.areas])].slice(0, 4);
  return next;
}

/** The address after the words were read, carrying what was said for the "Read as" line. */
export function wordsHref(query: ShelfQuery, said: string): string {
  const href = toShelfHref(query);
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}${SAID_PARAM}=${encodeURIComponent(said.slice(0, 120))}`;
}

/**
 * Whether the words still describe the filters on screen (batch 4 review):
 * the "Read ... as" line is shown only while every fact read from them is
 * still in force, so removing a chip does not leave a sentence claiming it.
 */
export function wordsShown(query: ShelfQuery, words: ParsedWords): boolean {
  if (!words.recognised) return false;
  if (words.bedrooms !== undefined && query.bedrooms !== words.bedrooms) return false;
  if (words.maxMinor !== undefined && query.maxMinor !== words.maxMinor) return false;
  if (words.minMinor !== undefined && query.minMinor !== words.minMinor) return false;
  if (words.intent && query.intent !== words.intent) return false;
  if (words.ownerDirect && !query.listerRoles.includes("owner")) return false;
  if (words.withBq && !query.withBq) return false;
  if (words.serviced && !query.servicedOnly) return false;
  if (words.shapes.some((shape) => !(query.shapes ?? []).includes(shape))) return false;
  if (words.areas.some((area) => !(query.areas ?? []).includes(area))) return false;
  return true;
}

/** Not part of the query: a one-time note of what the search box said. */
export const SAID_PARAM = "said";

export function shelfActiveCount(query: ShelfQuery): number {
  return activeFilterCount(query) + (query.intent ? 1 : 0);
}

export function clearedShelf(query: ShelfQuery): ShelfQuery {
  const cleared: ShelfQuery = clearedFilters(query);
  delete cleared.kind;
  return cleared;
}
