/**
 * WHICH CARD ON THE SHORTLIST, AS ONE STRING.
 *
 * The board holds two shelves: listings (`saved_items` or a device save) and
 * places (`saved_places`, a stay or a restaurant). An id alone does not name a
 * card across them: the places read already keys by `kind:id`
 * (`lib/saved/queries.ts`), and a listing id and a place id come from
 * different tables with nothing keeping them apart. So the board keys its
 * slots, its undo state, its messages and React's list by shelf and id, and a
 * repeated row collapses to one slot rather than drawing two cards under one
 * React key. Pure, so it is tested without rendering the board.
 */
export function savedBoardKey(item: { id: string; place?: { kind: string } }): string {
  return `${item.place ? item.place.kind : "listing"}:${item.id}`;
}

/** The keys of a list of items, first occurrence kept, in order. */
export function uniqueBoardKeys(items: { id: string; place?: { kind: string } }[]): string[] {
  return [...new Set(items.map(savedBoardKey))];
}
