import type { CatalogueEntryRow, StaySearchRow } from "../stays/types";
import { SAVED_PLACE_KINDS, type SavedPlaceKind } from "./db";

/**
 * The shortlist's pure half, for the Stays side.
 *
 * `places-actions.ts` writes rows; this decides, without a database, which
 * hearts light up on a shelf and how a mixed list splits into the sections
 * `/saved` renders. Kept separate so a card component and a test can reach
 * it without a server boundary.
 */

export type SavedPlaceKey = { entityKind: SavedPlaceKind; entityId: string };

/** One string per saved place, for a Set on the client. */
export function savedPlaceKey(place: SavedPlaceKey): string {
  return `${place.entityKind}:${place.entityId.toLowerCase()}`;
}

/** The set a shelf consults to light its hearts. */
export function savedKeySet(places: readonly SavedPlaceKey[]): Set<string> {
  return new Set(places.map(savedPlaceKey));
}

export function isSaved(
  keys: ReadonlySet<string>,
  entityKind: SavedPlaceKind,
  entityId: string,
): boolean {
  return keys.has(savedPlaceKey({ entityKind, entityId }));
}

/** A mixed shortlist, split by kind, each part keeping its order. */
export function partitionByKind<T extends SavedPlaceKey>(
  places: readonly T[],
): Record<SavedPlaceKind, T[]> {
  const out = Object.fromEntries(SAVED_PLACE_KINDS.map((kind) => [kind, [] as T[]])) as Record<
    SavedPlaceKind,
    T[]
  >;
  for (const place of places) {
    out[place.entityKind]?.push(place);
  }
  return out;
}

/** The Stays side of a shortlist: accommodations and restaurants only. */
export function staysSide<T extends SavedPlaceKey>(places: readonly T[]): T[] {
  return places.filter(
    (place) => place.entityKind === "accommodation" || place.entityKind === "restaurant",
  );
}

/**
 * ONE SAVED KEY, WHICH IS ALL A WRITE EVER KNOWS.
 *
 * It lived in `places-actions.ts` beside the writes that return it. A module
 * carrying the `"use server"` directive may export async functions and nothing
 * else, and this build has already lost production for twenty minutes to that
 * rule, so the shape moved to the pure half where a client component and a
 * test can reach it without a server boundary in the way.
 */
export type SavedPlace = {
  entityKind: SavedPlaceKind;
  entityId: string;
  /** ISO instant. */
  savedAt: string;
};

/**
 * A catalogue projection row as an UNDATED search row.
 *
 * `stays_search` answers in `StaySearchRow`, which is the projection plus what
 * a dated query adds, and the stays shelf and the stay card are both built on
 * it. A shortlist asks no dates: nobody hearting a hotel has said when they
 * are going. So the seven dated fields are stated as the nulls they honestly
 * are rather than left off the shape, and the same card renders a saved stay
 * and a searched one with no second adapter to drift.
 *
 * `total_count` is zero because this row did not come from a count; nothing
 * reads it off a single row.
 */
export function undatedSearchRow(entry: CatalogueEntryRow): StaySearchRow {
  return {
    ...entry,
    distance_m: null,
    nights: null,
    room_type_id: null,
    rate_plan_id: null,
    nightly_minor: null,
    total_minor: null,
    total_count: 0,
  };
}
