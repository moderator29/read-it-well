import type { RoomCategory } from "./types";

/*
 * THE STAYS URL CONTRACT WITHOUT THE VALIDATOR. The types, the limits, the
 * address builder and the badge count lived in `filters.ts` beside the zod
 * schema, and the stays filter sheet (and, through `shelf-query.ts`, the
 * property filter drawer) imported them from there, which put the whole of zod,
 * about 62 KB gzipped, into the first load of /search and /stays/search. They
 * are plain data and plain functions, so they live here and `filters.ts`
 * re-exports them: every existing import keeps working, and a client that only
 * needs to BUILD an address no longer ships the code that PARSES one. The same
 * split as `lib/interests/property-types.ts` from its `schema.ts`.
 *
 * The contract itself (every parameter, its range and its meaning) is
 * documented once, on `staysParamsSchema` in `filters.ts`.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type StaysSort = "recommended" | "price-asc" | "price-desc" | "top-rated" | "distance";

export const STAYS_SORTS: readonly StaysSort[] = [
  "recommended",
  "price-asc",
  "price-desc",
  "top-rated",
  "distance",
] as const;

export const KOBO_PER_NAIRA = 100;
export const MAX_ROOMS = 20;
export const MAX_GUESTS = 30;
export const MAX_NAIRA = 999_999_999;
export const MAX_RADIUS_KM = 50;
export const DEFAULT_RADIUS_KM = 5;
export const MAX_AMENITIES = 20;
export const PAGE_SIZE = 24;

/**
 * Every parameter the stays address carries, in the schema's order.
 *
 * `staysParamsSchema` is declared to `satisfies` exactly this set, so the list
 * and the schema cannot drift apart, and a client that needs only the NAMES
 * (the property shelf carrying a stays search across, `shelf-query.ts`) reads
 * them here instead of from `staysParamsSchema.shape`.
 */
export const STAYS_PARAM_KEYS = [
  "q",
  "near",
  "radius",
  "state",
  "city",
  "area",
  "in",
  "out",
  "rooms",
  "guests",
  "min",
  "max",
  "rating",
  "room",
  "amenities",
  "ac",
  "parking",
  "wifi",
  "breakfast",
  "free_cancel",
  "verified",
  "sort",
  "page",
] as const;

export type StaysParamKey = (typeof STAYS_PARAM_KEYS)[number];

/** Today's calendar date in Lagos as an ISO string, comparable with `<`. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

/** A parsed stays search. Money is integer kobo. */
export type StaysQuery = {
  q?: string;
  near?: string;
  /** Metres, only meaningful with `near`. */
  radiusM: number;
  stateCode?: string;
  city?: string;
  area?: string;
  /** Both present and check-out after check-in, or both absent. */
  checkIn?: string;
  checkOut?: string;
  rooms: number;
  guests?: number;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  minRating?: number;
  roomCategories: RoomCategory[];
  /** Every code that must be present, with ac, parking and wifi folded in. */
  amenities: string[];
  breakfast: boolean;
  freeCancellation: boolean;
  verified: boolean;
  sort: StaysSort;
  page: number;
};

/** Whole nights between two ISO dates, computed in UTC so DST cannot bite. */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = Date.UTC(
    Number(checkIn.slice(0, 4)),
    Number(checkIn.slice(5, 7)) - 1,
    Number(checkIn.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(checkOut.slice(0, 4)),
    Number(checkOut.slice(5, 7)) - 1,
    Number(checkOut.slice(8, 10)),
  );
  return Math.round((b - a) / 86_400_000);
}

/** The address for a query, with defaults left out so links stay short. */
export function toStaysHref(query: StaysQuery, basePath = "/stays"): string {
  const p = new URLSearchParams();
  if (query.q) p.set("q", query.q);
  if (query.near) {
    p.set("near", query.near);
    if (query.radiusM !== DEFAULT_RADIUS_KM * 1000) p.set("radius", String(Math.round(query.radiusM / 1000)));
  }
  if (query.stateCode) p.set("state", query.stateCode);
  if (query.city) p.set("city", query.city);
  if (query.area) p.set("area", query.area);
  if (query.checkIn && query.checkOut) {
    p.set("in", query.checkIn);
    p.set("out", query.checkOut);
  }
  if (query.rooms !== 1) p.set("rooms", String(query.rooms));
  if (query.guests !== undefined) p.set("guests", String(query.guests));
  if (query.minPriceMinor !== undefined) p.set("min", String(Math.round(query.minPriceMinor / KOBO_PER_NAIRA)));
  if (query.maxPriceMinor !== undefined) p.set("max", String(Math.round(query.maxPriceMinor / KOBO_PER_NAIRA)));
  if (query.minRating !== undefined) p.set("rating", String(query.minRating));
  if (query.roomCategories.length > 0) p.set("room", query.roomCategories.join(","));
  const named = new Set(["ac", "parking", "wifi"]);
  const rest = query.amenities.filter((code) => !named.has(code));
  if (rest.length > 0) p.set("amenities", rest.join(","));
  for (const code of ["ac", "parking", "wifi"]) {
    if (query.amenities.includes(code)) p.set(code, "1");
  }
  if (query.breakfast) p.set("breakfast", "1");
  if (query.freeCancellation) p.set("free_cancel", "1");
  if (query.verified) p.set("verified", "1");
  if (query.sort !== "recommended") p.set("sort", query.sort);
  if (query.page > 1) p.set("page", String(query.page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** How many of the twelve filters are set, for the drawer's badge. */
export function activeFilterCount(query: StaysQuery): number {
  let n = 0;
  if (query.minPriceMinor !== undefined || query.maxPriceMinor !== undefined) n += 1;
  if (query.minRating !== undefined) n += 1;
  if (query.stateCode || query.city || query.area) n += 1;
  if (query.roomCategories.length > 0) n += 1;
  const named = new Set(["ac", "parking", "wifi"]);
  if (query.amenities.some((code) => !named.has(code))) n += 1;
  if (query.breakfast) n += 1;
  if (query.amenities.includes("ac")) n += 1;
  if (query.amenities.includes("parking")) n += 1;
  if (query.amenities.includes("wifi")) n += 1;
  if (query.verified) n += 1;
  if (query.freeCancellation) n += 1;
  if (query.near) n += 1;
  return n;
}
