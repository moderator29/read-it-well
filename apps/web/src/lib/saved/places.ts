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
