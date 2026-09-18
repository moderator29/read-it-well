import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { staysClient, type StaysClient, type StaysSearchArgs } from "./db";
import { DEFAULT_RADIUS_KM, MAX_RADIUS_KM, PAGE_SIZE, type StaysQuery, type StaysSort } from "./filters";
import { ROOM_CATEGORIES, type CatalogueEntityKind, type LandmarkHit, type RoomCategory, type StaySearchResult, type StaySearchRow } from "./types";

/**
 * The twelve-filter stays search.
 *
 * One call to `public.stays_search`, which is one SQL statement over the M9
 * catalogue projection with the availability-aware room join for dated
 * queries: an accommodation matches a dated search only when some published
 * room type has a `room_inventory` row for every night with enough units
 * free, and some active rate plan admits the stay and is not closed on any of
 * those nights. Nothing is filtered in Node: the function carries every
 * filter, so the page is complete and `total` is the true count.
 *
 * THE TWELVE FILTERS, named as the ledger's contract names them (section
 * 2.1) and mapped onto the function's parameters:
 *
 *   rating            p_min_rating       the projection's rating_avg
 *   roomType          p_room_categories  any of the categories, on the shelf
 *                                        flag AND on the dated room join
 *   facilities        p_amenities        every code must be present
 *   breakfast         p_breakfast        the has_breakfast shelf flag; on a
 *                                        dated query the plan's meal plan
 *   ac, parking, wifi p_amenities        the three named facilities are the
 *                                        amenity codes of the same name
 *   verified          p_verified         first party, not an example, badge
 *   freeCancellation  p_free_cancellation the has_free_cancellation flag; on
 *                                        a dated query the plan's policy
 *   nearLandmark      p_lat, p_lng, p_radius_m through landmarks_resolve
 *   priceMin, priceMax p_min/max_price_minor in kobo, on the whole stay when
 *                                        dated, else the headline price
 *   location          p_state_code, p_city, p_area
 *
 * plus checkIn, checkOut, guests, rooms and the cursor. The four shelf flags
 * (rating, breakfast, free cancellation, room categories) live on the
 * projection and are recomputed by the M9 triggers, so a filter over the
 * merged shelf never joins per row; the dated join re-checks the three that
 * depend on the plan actually offered.
 *
 * THE CURSOR is opaque to callers and is an offset underneath, because the
 * function pages by offset: the shelf is a standing catalogue ordered by
 * featured and publish date, not a timeline, so a row arriving mid-scroll can
 * shift a page by one and that is acceptable where it would not be for a
 * feed. A cursor that does not decode starts from the top rather than
 * refusing.
 *
 * `near` is resolved first through `public.landmarks_resolve` (trigram over
 * name and aliases), and the best hit becomes the point and radius the
 * search measures from. A term that resolves to nothing is dropped rather
 * than refused, and the result says so by returning `near: null`, so the
 * page can tell the person the place was not recognised instead of quietly
 * showing them everything.
 *
 * Both calls run through the caller's own RLS-bound client: the projection's
 * policy shows a signed-out visitor published rows and nothing else, and
 * neither function is security definer. The client is injectable so the
 * builder and the paging are proved against a fake.
 *
 * Every failure degrades into an empty shelf. Nothing here throws.
 */

const STAY_KINDS: CatalogueEntityKind[] = ["listing", "accommodation"];

export const MAX_PAGE = 100;

/** The ledger's contract shape. Every money field is integer kobo. */
export type StaySearchParams = {
  q?: string;
  /** Minimum average rating, 1 to 5. */
  rating?: number;
  /** One category or several; any of them will do. */
  roomType?: RoomCategory | RoomCategory[];
  /** Amenity codes that must all be present. */
  facilities?: string[];
  breakfast?: boolean;
  ac?: boolean;
  parking?: boolean;
  wifi?: boolean;
  verified?: boolean;
  freeCancellation?: boolean;
  /** A landmark as a person says it; resolved through `landmarks_resolve`. */
  nearLandmark?: string;
  /** Kilometres around the landmark, 1 to 50. Only meaningful with one. */
  withinKm?: number;
  priceMin?: number;
  priceMax?: number;
  location?: { stateCode?: string; city?: string; area?: string };
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  sort?: StaysSort;
  cursor?: string | null;
  /** Rows per page, 1 to 100. */
  limit?: number;
  /** Which shelves to search. Stays by default: listings and accommodations. */
  kinds?: CatalogueEntityKind[];
};

export type StaySearchPage = StaySearchResult & {
  /** Hand this back to get the next page. Null when there is none. */
  cursor: string | null;
  ended: boolean;
};

/** What `searchStays` needs from the outside; injectable for a test. */
export type StaySearchDeps = {
  client?: () => Promise<StaysClient>;
  configured?: () => boolean;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ----------------------------------------------------------- the cursor */

const CURSOR_PREFIX = "o:";

export function encodeCursor(offset: number): string {
  return Buffer.from(`${CURSOR_PREFIX}${Math.max(0, Math.trunc(offset))}`, "utf8").toString("base64url");
}

/** The offset a cursor names, or 0 for anything that is not a cursor. */
export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    if (!raw.startsWith(CURSOR_PREFIX)) return 0;
    const n = Number(raw.slice(CURSOR_PREFIX.length));
    return Number.isInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/* ----------------------------------------------------------- the shapes */

/** The URL-parsed query as the contract shape, so both spellings meet once. */
export function fromStaysQuery(query: StaysQuery): StaySearchParams {
  const named = new Set(["ac", "parking", "wifi"]);
  return {
    q: query.q,
    rating: query.minRating,
    roomType: query.roomCategories,
    facilities: query.amenities.filter((code) => !named.has(code)),
    ac: query.amenities.includes("ac"),
    parking: query.amenities.includes("parking"),
    wifi: query.amenities.includes("wifi"),
    breakfast: query.breakfast,
    verified: query.verified,
    freeCancellation: query.freeCancellation,
    nearLandmark: query.near,
    withinKm: Math.round(query.radiusM / 1000),
    priceMin: query.minPriceMinor,
    priceMax: query.maxPriceMinor,
    location: { stateCode: query.stateCode, city: query.city, area: query.area },
    checkIn: query.checkIn,
    checkOut: query.checkOut,
    guests: query.guests,
    rooms: query.rooms,
    sort: query.sort,
    cursor: query.page > 1 ? encodeCursor((query.page - 1) * PAGE_SIZE) : null,
    limit: PAGE_SIZE,
  };
}

function isStaysQuery(input: StaySearchParams | StaysQuery): input is StaysQuery {
  return "radiusM" in input && "page" in input && Array.isArray((input as StaysQuery).roomCategories);
}

function wholeInRange(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const n = Math.trunc(value);
  return n < min || n > max ? undefined : n;
}

/** Money is accepted only as a non-negative integer number of kobo. */
function kobo(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 0) return undefined;
  return value;
}

/**
 * The function's arguments for a contract-shaped search.
 *
 * Pure, so it is the thing the tests prove: every filter lands on exactly one
 * parameter, a false flag sends nothing (the function's `p_x is not true`
 * form treats null and false the same, and sending nothing keeps the call
 * readable in a log), dates travel only as a valid pair, and rubbish falls
 * away rather than reaching Postgres.
 */
export function buildStaySearchArgs(params: StaySearchParams, near: LandmarkHit | null): StaysSearchArgs {
  const limit = wholeInRange(params.limit, 1, MAX_PAGE) ?? PAGE_SIZE;
  const args: StaysSearchArgs = {
    p_entity_kinds: params.kinds && params.kinds.length > 0 ? params.kinds : STAY_KINDS,
    p_rooms: wholeInRange(params.rooms, 1, 20) ?? 1,
    p_sort: params.sort ?? "recommended",
    p_limit: limit,
    p_offset: decodeCursor(params.cursor),
  };

  const q = params.q?.trim();
  if (q && q.length >= 2) args.p_q = q.slice(0, 120);

  const loc = params.location ?? {};
  if (loc.stateCode && /^[A-Za-z]{2}$/.test(loc.stateCode)) args.p_state_code = loc.stateCode.toUpperCase();
  if (loc.city?.trim()) args.p_city = loc.city.trim();
  if (loc.area?.trim()) args.p_area = loc.area.trim();

  // Dates travel as a pair, in order. One date, or a reversed pair, is an
  // undated search, never half a dated one.
  if (
    params.checkIn &&
    params.checkOut &&
    ISO_DATE_RE.test(params.checkIn) &&
    ISO_DATE_RE.test(params.checkOut) &&
    params.checkOut > params.checkIn
  ) {
    args.p_check_in = params.checkIn;
    args.p_check_out = params.checkOut;
  }

  const guests = wholeInRange(params.guests, 1, 30);
  if (guests !== undefined) args.p_guests = guests;

  // A budget that cannot hold anything is not a budget.
  let min = kobo(params.priceMin);
  let max = kobo(params.priceMax);
  if (min !== undefined && max !== undefined && min > max) {
    min = undefined;
    max = undefined;
  }
  if (min !== undefined) args.p_min_price_minor = min;
  if (max !== undefined) args.p_max_price_minor = max;

  const rating = wholeInRange(params.rating, 1, 5);
  if (rating !== undefined) args.p_min_rating = rating;

  const wanted = Array.isArray(params.roomType) ? params.roomType : params.roomType ? [params.roomType] : [];
  const categories = wanted.filter(
    (c, i, all) => (ROOM_CATEGORIES as readonly string[]).includes(c) && all.indexOf(c) === i,
  );
  if (categories.length > 0) args.p_room_categories = categories;

  // The three named facilities are amenity codes; folded in once each.
  const codes: string[] = [];
  for (const code of params.facilities ?? []) {
    const clean = code.trim().toLowerCase();
    if (/^[a-z][a-z0-9_-]{0,23}$/.test(clean) && !codes.includes(clean)) codes.push(clean);
  }
  for (const [on, code] of [
    [params.ac, "ac"],
    [params.parking, "parking"],
    [params.wifi, "wifi"],
  ] as const) {
    if (on && !codes.includes(code)) codes.push(code);
  }
  if (codes.length > 0) args.p_amenities = codes.slice(0, 20);

  if (params.breakfast) args.p_breakfast = true;
  if (params.freeCancellation) args.p_free_cancellation = true;
  if (params.verified) args.p_verified = true;

  if (near) {
    args.p_lat = near.latitude;
    args.p_lng = near.longitude;
    args.p_radius_m = (wholeInRange(params.withinKm, 1, MAX_RADIUS_KM) ?? DEFAULT_RADIUS_KM) * 1000;
    // A landmark scopes the search to its state unless the address already did.
    if (!args.p_state_code) args.p_state_code = near.state_code;
  }

  // A "distance" sort with no point to measure from is the default order.
  if (!near && args.p_sort === "distance") args.p_sort = "recommended";

  return args;
}

/** Kept for the URL-shaped caller: the same builder, through the contract shape. */
export function toSearchArgs(
  query: StaysQuery,
  near: LandmarkHit | null,
  entityKinds: CatalogueEntityKind[] = STAY_KINDS,
): StaysSearchArgs {
  return buildStaySearchArgs({ ...fromStaysQuery(query), kinds: entityKinds }, near);
}

/* ----------------------------------------------------------- the reads */

export async function resolveLandmark(
  term: string,
  stateCode?: string,
  deps: StaySearchDeps = {},
): Promise<LandmarkHit | null> {
  const configured = deps.configured ?? isSupabaseConfigured;
  if (!configured() || term.trim().length < 2) return null;
  try {
    const supabase = await (deps.client ?? staysClient)();
    const { data, error } = await supabase.rpc("landmarks_resolve", {
      p_term: term.trim(),
      p_state: stateCode,
      p_limit: 1,
    });
    if (error || !data) return null;
    return data[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * One page of stays for the contract shape, or for the URL-parsed query.
 *
 * `total` is the true count under the filters; `cursor` is null once the last
 * row has been served, so a load-more control knows when to stop without a
 * second round trip.
 */
export async function searchStays(
  input: StaySearchParams | StaysQuery,
  deps: StaySearchDeps = {},
): Promise<StaySearchPage> {
  const params = isStaysQuery(input) ? fromStaysQuery(input) : input;
  const empty: StaySearchPage = { rows: [], total: 0, near: null, cursor: null, ended: true };
  const configured = deps.configured ?? isSupabaseConfigured;
  if (!configured()) return empty;

  const near = params.nearLandmark
    ? await resolveLandmark(params.nearLandmark, params.location?.stateCode, deps)
    : null;
  const args = buildStaySearchArgs(params, near);

  try {
    const supabase = await (deps.client ?? staysClient)();
    const { data, error } = await supabase.rpc("stays_search", args);
    if (error || !data) return { ...empty, near };
    const rows: StaySearchRow[] = data;
    const total = Number(rows[0]?.total_count ?? 0);
    const offset = args.p_offset ?? 0;
    const served = offset + rows.length;
    const ended = rows.length === 0 || served >= total;
    return { rows, total, near, cursor: ended ? null : encodeCursor(served), ended };
  } catch {
    return { ...empty, near };
  }
}
