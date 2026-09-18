import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { staysClient, type StaysSearchArgs } from "./db";
import { PAGE_SIZE, type StaysQuery } from "./filters";
import type { CatalogueEntityKind, LandmarkHit, StaySearchResult } from "./types";

/**
 * The twelve-filter stays search.
 *
 * One call to `public.stays_search`, which is one SQL statement over the
 * catalogue projection with the availability-aware room join for dated
 * queries. Nothing is filtered in Node: the function carries every filter,
 * so the result is complete for its page and `total` is the true count.
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
 * neither function is security definer.
 *
 * Every failure degrades into an empty shelf. Nothing here throws.
 */

const STAY_KINDS: CatalogueEntityKind[] = ["listing", "accommodation"];

export async function resolveLandmark(
  term: string,
  stateCode?: string,
): Promise<LandmarkHit | null> {
  if (!isSupabaseConfigured() || term.trim().length < 2) return null;
  try {
    const supabase = await staysClient();
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

export function toSearchArgs(
  query: StaysQuery,
  near: LandmarkHit | null,
  entityKinds: CatalogueEntityKind[] = STAY_KINDS,
): StaysSearchArgs {
  const args: StaysSearchArgs = {
    p_entity_kinds: entityKinds,
    p_rooms: query.rooms,
    p_sort: query.sort,
    p_limit: PAGE_SIZE,
    p_offset: (query.page - 1) * PAGE_SIZE,
  };
  if (query.q) args.p_q = query.q;
  if (query.stateCode) args.p_state_code = query.stateCode;
  if (query.city) args.p_city = query.city;
  if (query.area) args.p_area = query.area;
  if (query.checkIn && query.checkOut) {
    args.p_check_in = query.checkIn;
    args.p_check_out = query.checkOut;
  }
  if (query.guests !== undefined) args.p_guests = query.guests;
  if (query.minPriceMinor !== undefined) args.p_min_price_minor = query.minPriceMinor;
  if (query.maxPriceMinor !== undefined) args.p_max_price_minor = query.maxPriceMinor;
  if (query.minRating !== undefined) args.p_min_rating = query.minRating;
  if (query.roomCategories.length > 0) args.p_room_categories = query.roomCategories;
  if (query.amenities.length > 0) args.p_amenities = query.amenities;
  if (query.breakfast) args.p_breakfast = true;
  if (query.freeCancellation) args.p_free_cancellation = true;
  if (query.verified) args.p_verified = true;
  if (near) {
    args.p_lat = near.latitude;
    args.p_lng = near.longitude;
    args.p_radius_m = query.radiusM;
    // A landmark scopes the search to its state unless the address already did.
    if (!args.p_state_code) args.p_state_code = near.state_code;
  }
  return args;
}

export async function searchStays(
  query: StaysQuery,
  entityKinds: CatalogueEntityKind[] = STAY_KINDS,
): Promise<StaySearchResult> {
  const empty: StaySearchResult = { rows: [], total: 0, near: null };
  if (!isSupabaseConfigured()) return empty;

  const near = query.near ? await resolveLandmark(query.near, query.stateCode) : null;
  const args = toSearchArgs(query, near, entityKinds);
  // A "distance" sort with no point to measure from is the default order.
  if (!near && args.p_sort === "distance") args.p_sort = "recommended";

  try {
    const supabase = await staysClient();
    const { data, error } = await supabase.rpc("stays_search", args);
    if (error || !data) return { ...empty, near };
    const rows = data;
    const head = rows[0];
    const total = head ? Number(head.total_count) : 0;
    return { rows, total, near };
  } catch {
    return { ...empty, near };
  }
}
