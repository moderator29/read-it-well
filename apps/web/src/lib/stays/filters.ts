import { z } from "zod";

import { ROOM_CATEGORIES, type RoomCategory } from "./types";

/**
 * The stays URL contract.
 *
 * The address bar is the single source of truth for a stays search, as it is
 * for discovery: every control writes here, nothing else holds state, and a
 * hunt can be copied, bookmarked and walked back with the browser button.
 *
 *   q           free text over title, area and city
 *   near        a landmark as a person says it ("VI", "airport", "Jabi")
 *   radius      kilometres around the landmark, 1 to 50 (default 5)
 *   state       two-letter state code
 *   city, area  place names, matched case-insensitively
 *   in, out     check-in and check-out as YYYY-MM-DD; both or neither
 *   rooms       rooms wanted, 1 to 20 (default 1)
 *   guests      people, 1 to 30
 *   min, max    budget bounds in WHOLE NAIRA, the one place naira appears;
 *               on a dated search they bound the whole stay, otherwise the
 *               headline price
 *   rating      minimum average rating, 1 to 5
 *   room        comma separated room categories, ANY of which will do
 *   amenities   comma separated amenity codes, ALL of which must be present
 *   ac, parking, wifi
 *               "1" for the three facilities people ask for by name; each is
 *               the amenity code of the same name and joins `amenities`
 *   breakfast   "1" for a rate that includes breakfast
 *   free_cancel "1" for a rate whose policy is free to cancel until some hour
 *   verified    "1" for first-party inventory behind a badge
 *   sort        recommended | price-asc | price-desc | top-rated | distance
 *   page        1-based page
 *
 * Money: the URL carries naira and this module is the only place that
 * multiplies. Every field of `StaysQuery` that is money is integer kobo.
 *
 * Parsing is defensive by construction and zod does the deciding: each field
 * either parses to a clean value or falls back to "not given", so an address
 * full of rubbish renders the unfiltered shelf rather than an error. The one
 * cross-field rule (check-out after check-in, both present) is applied after
 * parsing, and a broken pair drops BOTH dates rather than keeping one.
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const AMENITY_CODE_RE = /^[a-z][a-z0-9_-]{0,23}$/;

/** True when the string is a real calendar date, not merely date-shaped. */
function isRealDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** Today's calendar date in Lagos as an ISO string, comparable with `<`. */
export function lagosToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(now);
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** A trimmed, bounded string, or undefined. Rubbish is dropped, never thrown. */
const text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .optional()
    .catch(undefined);

/** Digits only, within range. "1e3", "-4", "2.5" and "" are rubbish. */
const whole = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d{1,10}$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max))
    .optional()
    .catch(undefined);

const flag = z
  .string()
  .transform((v) => v === "1" || v === "true")
  .optional()
  .catch(undefined)
  .transform((v) => v === true);

const isoDate = z
  .string()
  .refine(isRealDate)
  .optional()
  .catch(undefined);

const csv = <T extends string>(accept: (part: string) => T | undefined, limit: number) =>
  z
    .string()
    .transform((raw) => {
      const out: T[] = [];
      for (const part of raw.split(",")) {
        const found = accept(part.trim().toLowerCase());
        if (found === undefined || out.includes(found)) continue;
        out.push(found);
        if (out.length >= limit) break;
      }
      return out;
    })
    .optional()
    .catch(undefined)
    .transform((v) => v ?? []);

const roomCategory = (part: string): RoomCategory | undefined =>
  (ROOM_CATEGORIES as readonly string[]).includes(part) ? (part as RoomCategory) : undefined;

const amenityCode = (part: string): string | undefined =>
  AMENITY_CODE_RE.test(part) ? part : undefined;

/**
 * The raw shape after each parameter is reduced to its first string value.
 * Kept exported so a form can validate one field with the same rule.
 */
export const staysParamsSchema = z.object({
  q: text(120),
  near: text(80),
  radius: whole(1, MAX_RADIUS_KM),
  state: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((v) => v.toUpperCase())
    .optional()
    .catch(undefined),
  city: text(80),
  area: text(80),
  in: isoDate,
  out: isoDate,
  rooms: whole(1, MAX_ROOMS),
  guests: whole(1, MAX_GUESTS),
  min: whole(0, MAX_NAIRA),
  max: whole(0, MAX_NAIRA),
  rating: whole(1, 5),
  room: csv(roomCategory, ROOM_CATEGORIES.length),
  amenities: csv(amenityCode, MAX_AMENITIES),
  ac: flag,
  parking: flag,
  wifi: flag,
  breakfast: flag,
  free_cancel: flag,
  verified: flag,
  sort: z.enum(STAYS_SORTS as [StaysSort, ...StaysSort[]]).optional().catch(undefined),
  page: whole(1, 500),
});

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

/**
 * Read an address into a query. Never throws.
 *
 * `today` is injectable so the past-date rule can be proved without the clock.
 */
export function parseStaysQuery(
  params: RawSearchParams,
  today: string = lagosToday(),
): StaysQuery {
  const raw: Record<string, string | undefined> = {};
  for (const key of Object.keys(staysParamsSchema.shape)) {
    raw[key] = first(params[key]);
  }
  const parsed = staysParamsSchema.parse(raw);

  // Dates travel as a pair. A single date, a reversed pair, or a stay in the
  // past is not a dated search; it is an undated one with a broken address.
  let checkIn: string | undefined;
  let checkOut: string | undefined;
  if (parsed.in && parsed.out && parsed.out > parsed.in && parsed.in >= today) {
    checkIn = parsed.in;
    checkOut = parsed.out;
  }

  // A budget that cannot hold anything is not a budget.
  let minPriceMinor = parsed.min === undefined ? undefined : parsed.min * KOBO_PER_NAIRA;
  let maxPriceMinor = parsed.max === undefined ? undefined : parsed.max * KOBO_PER_NAIRA;
  if (minPriceMinor !== undefined && maxPriceMinor !== undefined && minPriceMinor > maxPriceMinor) {
    minPriceMinor = undefined;
    maxPriceMinor = undefined;
  }

  const amenities = [...parsed.amenities];
  for (const [flagOn, code] of [
    [parsed.ac, "ac"],
    [parsed.parking, "parking"],
    [parsed.wifi, "wifi"],
  ] as const) {
    if (flagOn && !amenities.includes(code)) amenities.push(code);
  }

  const near = parsed.near;
  const sort = parsed.sort ?? "recommended";

  return {
    q: parsed.q,
    near,
    radiusM: (parsed.radius ?? DEFAULT_RADIUS_KM) * 1000,
    stateCode: parsed.state,
    city: parsed.city,
    area: parsed.area,
    checkIn,
    checkOut,
    rooms: parsed.rooms ?? 1,
    guests: parsed.guests,
    minPriceMinor,
    maxPriceMinor,
    minRating: parsed.rating,
    roomCategories: parsed.room,
    amenities,
    breakfast: parsed.breakfast,
    freeCancellation: parsed.free_cancel,
    verified: parsed.verified,
    // Distance is only an order when there is a point to measure from.
    sort: sort === "distance" && !near ? "recommended" : sort,
    page: parsed.page ?? 1,
  };
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
