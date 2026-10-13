import { toShelfHref, toShelfViewHref, type ShelfQuery } from "./shelf-query";

/**
 * THE QUICK CHIPS UNDER THE SEARCH BAR, AS ADDRESSES THE SHELF ALREADY READS.
 *
 * Nothing here is a new parameter. "For you" is the published Recommended
 * order (`sort` absent), which is also where the shelf puts the kinds the
 * person said they came for first; "New listed" is `sort=newest`; "Near me"
 * is the map view at the reader's position, written in the same `lat`, `lng`
 * and `z` the map already writes into the address as it is panned
 * (`map-viewport.ts`), so the map opens there and every filter in force is
 * kept. The market chip beside them is the existing one and opens the sheet.
 */
export type QuickChipKey = "forYou" | "nearMe" | "newListed";

export type QuickChip = { key: QuickChipKey; href: string; on: boolean };

/** The two chips that are plain links; "Near me" needs the device and is built on tap. */
export function quickChips(query: ShelfQuery): QuickChip[] {
  return [
    { key: "forYou", href: toShelfHref({ ...query, sort: "recommended" }), on: query.sort === "recommended" },
    { key: "newListed", href: toShelfHref({ ...query, sort: "newest" }), on: query.sort === "newest" },
  ];
}

/** The zoom "Near me" opens at: a few streets either way. */
export const NEAR_ME_ZOOM = 14;

/** The map view at a position, with the search kept: `/search?...&view=map&lat=..&lng=..&z=14`. */
export function nearMeHref(query: ShelfQuery, at: { lat: number; lng: number }): string {
  const href = toShelfViewHref(query, "map");
  const joiner = href.includes("?") ? "&" : "?";
  return `${href}${joiner}lat=${at.lat.toFixed(4)}&lng=${at.lng.toFixed(4)}&z=${NEAR_ME_ZOOM}`;
}
