import type { ListingKind, ListingSearchFilter } from "./types";

/**
 * The discovery URL contract.
 *
 * The address bar is the single source of truth for a search. Every control on
 * the page writes here and nothing else, so a filtered hunt can be copied to a
 * friend, opened on a second device, bookmarked, and walked backwards with the
 * browser's own back button. There is no client state that the URL does not
 * already describe.
 *
 *   q          free text
 *   type       category, one of the real ListingKind values
 *              (legacy aliases: "property" is apartment, "rent" is rental)
 *   sort       recommended | top-rated | price-asc | price-desc
 *   view       list | map
 *   min, max   budget bounds in WHOLE NAIRA, the one place naira appears
 *   beds       minimum bedrooms
 *   baths      minimum bathrooms
 *   guests     minimum party size the place must take
 *   amenities  comma separated amenity codes, all of which must be present
 *   instant    "1" for instant book only
 *   verified   "1" for first-party verified inventory only
 *
 * Money: the URL is the human boundary, so it carries naira, and this module is
 * the only place that multiplies. Everything downstream, including every field
 * of `ListingSearchFilter`, is integer kobo.
 *
 * Parsing is defensive by construction. Every reader below either returns a
 * clean value or `undefined`; nothing throws, nothing propagates NaN, and an
 * address full of rubbish renders the unfiltered page rather than an error.
 */

export type SortKey = "recommended" | "top-rated" | "price-asc" | "price-desc";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "top-rated", label: "Top rated" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
];

export type ViewKey = "list" | "map";

/** Singular and plural nouns per category, for honest result counts. */
export const KIND_NOUN: Record<ListingKind, { one: string; many: string }> = {
  hotel: { one: "hotel", many: "hotels" },
  apartment: { one: "apartment", many: "apartments" },
  home: { one: "home", many: "homes" },
  shortlet: { one: "shortlet", many: "shortlets" },
  villa: { one: "villa", many: "villas" },
  restaurant: { one: "restaurant", many: "restaurants" },
  experience: { one: "experience", many: "experiences" },
  rental: { one: "rental", many: "rentals" },
  shop: { one: "shop", many: "shops" },
  office: { one: "office", many: "offices" },
  land: { one: "plot", many: "plots" },
};

/** Everything a discovery request is, parsed and clean. */
export type DiscoveryQuery = {
  q?: string;
  kind?: ListingKind;
  sort: SortKey;
  view: ViewKey;
  /** Budget bounds in integer kobo. */
  minMinor?: number;
  maxMinor?: number;
  bedrooms?: number;
  bathrooms?: number;
  guests?: number;
  amenities: string[];
  instantBook: boolean;
  verifiedOnly: boolean;
};

/** The raw shape Next hands a page, before anything has been trusted. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export const KOBO_PER_NAIRA = 100;

/** Naira at the boundary, kobo everywhere else. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira) * KOBO_PER_NAIRA;
}

/** Kobo back to whole naira, for the one input that speaks naira. */
export function koboToNaira(kobo: number): number {
  return Math.round(kobo / KOBO_PER_NAIRA);
}

/** Ceilings that keep an address hostile-input safe rather than merely tidy. */
const MAX_TEXT = 120;
const MAX_ROOMS = 20;
const MAX_GUESTS = 30;
const MAX_NAIRA = 999_999_999;
const MAX_AMENITIES = 20;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function readText(value: string | string[] | undefined): string | undefined {
  const raw = first(value);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim().slice(0, MAX_TEXT);
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * A whole number in range, or nothing at all.
 *
 * Digits only: "1e3", "-4", "2.5", "abc" and an empty string are all rubbish
 * and are dropped rather than coerced into something surprising.
 */
function readInt(
  value: string | string[] | undefined,
  min: number,
  max: number,
): number | undefined {
  const raw = first(value);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!/^\d{1,10}$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

function readFlag(value: string | string[] | undefined): boolean {
  const raw = first(value);
  return raw === "1" || raw === "true";
}

/** Amenity codes are lowercase slugs. Anything else is not a code. */
function readAmenities(value: string | string[] | undefined): string[] {
  const raw = first(value);
  if (typeof raw !== "string") return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const code = part.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]{0,23}$/.test(code)) continue;
    if (out.includes(code)) continue;
    out.push(code);
    if (out.length >= MAX_AMENITIES) break;
  }
  return out;
}

/** Category, accepting the two legacy aliases older links still carry. */
export function parseKind(type: string | undefined): ListingKind | undefined {
  if (!type) return undefined;
  const normalised = type === "property" ? "apartment" : type === "rent" ? "rental" : type;
  return normalised in KIND_NOUN ? (normalised as ListingKind) : undefined;
}

/** Read the address bar into a clean request. Never throws, never NaN. */
export function parseDiscoveryQuery(params: RawSearchParams): DiscoveryQuery {
  const sortRaw = readText(params.sort);
  const sort: SortKey = SORTS.some((s) => s.key === sortRaw)
    ? (sortRaw as SortKey)
    : "recommended";

  let minNaira = readInt(params.min, 0, MAX_NAIRA);
  let maxNaira = readInt(params.max, 0, MAX_NAIRA);
  // A range typed backwards is a slip, not an empty result set.
  if (minNaira !== undefined && maxNaira !== undefined && minNaira > maxNaira) {
    [minNaira, maxNaira] = [maxNaira, minNaira];
  }

  const query: DiscoveryQuery = {
    sort,
    view: readText(params.view) === "map" ? "map" : "list",
    amenities: readAmenities(params.amenities),
    instantBook: readFlag(params.instant),
    verifiedOnly: readFlag(params.verified),
  };

  const q = readText(params.q);
  if (q !== undefined) query.q = q;
  const kind = parseKind(readText(params.type));
  if (kind !== undefined) query.kind = kind;
  if (minNaira !== undefined) query.minMinor = nairaToKobo(minNaira);
  if (maxNaira !== undefined) query.maxMinor = nairaToKobo(maxNaira);

  const bedrooms = readInt(params.beds, 1, MAX_ROOMS);
  if (bedrooms !== undefined) query.bedrooms = bedrooms;
  const bathrooms = readInt(params.baths, 1, MAX_ROOMS);
  if (bathrooms !== undefined) query.bathrooms = bathrooms;
  const guests = readInt(params.guests, 1, MAX_GUESTS);
  if (guests !== undefined) query.guests = guests;

  return query;
}

/** The repository question this request asks. Sort and view are ours, not its. */
export function toFilter(query: DiscoveryQuery): ListingSearchFilter {
  const filter: ListingSearchFilter = {};
  if (query.q) filter.q = query.q;
  if (query.kind) filter.kind = query.kind;
  if (query.minMinor !== undefined) filter.minPriceMinor = query.minMinor;
  if (query.maxMinor !== undefined) filter.maxPriceMinor = query.maxMinor;
  if (query.bedrooms !== undefined) filter.bedrooms = query.bedrooms;
  if (query.bathrooms !== undefined) filter.bathrooms = query.bathrooms;
  if (query.guests !== undefined) filter.guests = query.guests;
  if (query.amenities.length > 0) filter.amenities = query.amenities;
  if (query.instantBook) filter.instantBook = true;
  if (query.verifiedOnly) filter.verifiedOnly = true;
  return filter;
}

/**
 * The pool a filter drawer counts against: the same text and category, none of
 * the structured bounds. It is what "how many places match" is measured out of.
 */
export function toPoolFilter(query: DiscoveryQuery): ListingSearchFilter {
  const filter: ListingSearchFilter = {};
  if (query.q) filter.q = query.q;
  if (query.kind) filter.kind = query.kind;
  return filter;
}

/** Write a request back to the address bar. Defaults are left out. */
export function toSearchHref(query: DiscoveryQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.kind) params.set("type", query.kind);
  if (query.sort !== "recommended") params.set("sort", query.sort);
  if (query.view === "map") params.set("view", "map");
  if (query.minMinor !== undefined) params.set("min", String(koboToNaira(query.minMinor)));
  if (query.maxMinor !== undefined) params.set("max", String(koboToNaira(query.maxMinor)));
  if (query.bedrooms !== undefined) params.set("beds", String(query.bedrooms));
  if (query.bathrooms !== undefined) params.set("baths", String(query.bathrooms));
  if (query.guests !== undefined) params.set("guests", String(query.guests));
  if (query.amenities.length > 0) params.set("amenities", query.amenities.join(","));
  if (query.instantBook) params.set("instant", "1");
  if (query.verifiedOnly) params.set("verified", "1");
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Everything the drawer owns, cleared. Text, category, sort and view stay. */
export function clearedFilters(query: DiscoveryQuery): DiscoveryQuery {
  const cleared: DiscoveryQuery = {
    sort: query.sort,
    view: query.view,
    amenities: [],
    instantBook: false,
    verifiedOnly: false,
  };
  if (query.q) cleared.q = query.q;
  if (query.kind) cleared.kind = query.kind;
  return cleared;
}

/**
 * How many filters are switched on, for the badge on the opener.
 *
 * A price range counts once however many ends it has, because a traveller set
 * one thing: a budget.
 */
export function activeFilterCount(query: DiscoveryQuery): number {
  let count = 0;
  if (query.minMinor !== undefined || query.maxMinor !== undefined) count += 1;
  if (query.bedrooms !== undefined) count += 1;
  if (query.bathrooms !== undefined) count += 1;
  if (query.guests !== undefined) count += 1;
  count += query.amenities.length;
  if (query.instantBook) count += 1;
  if (query.verifiedOnly) count += 1;
  return count;
}
