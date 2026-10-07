import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { listingShelf, placeShelf } from "@/app/(app)/saved/shelf-rows";
import { PageScene } from "@/components/app/PageScene";
import { SavedBoard, type SavedBoardItem } from "@/app/(app)/saved/SavedBoard";
import { RESTAURANTS, SHELF, STAYS } from "../fixtures";

/**
 * /saved with all three shelves on one board: two saved listings, a saved
 * stay and a saved restaurant, each drawn as the route draws it: a shelf
 * (`shelf-rows.tsx`, the founder's before-after-collection-shelves.jpg).
 */
export default async function SavedPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const stay = STAYS[0]!;
  const table = RESTAURANTS[0]!;
  const items: SavedBoardItem[] = [
    {
      id: stay.id,
      mode: "db",
      savedAt: 1_789_700_000,
      place: { kind: "accommodation", id: stay.id },
      card: placeShelf({ ...stay, place: { kind: "accommodation", id: stay.id } }, locale, t, true),
    },
    {
      id: table.id,
      mode: "db",
      savedAt: 1_789_699_000,
      place: { kind: "restaurant", id: table.id },
      card: placeShelf({ ...table, place: { kind: "restaurant", id: table.id } }, locale, t, false),
    },
    ...SHELF.slice(0, 2).map<SavedBoardItem>((listing, i) => ({
      id: listing.id,
      mode: "local",
      savedAt: 1_789_698_000 - i * 60,
      card: listingShelf(listing, locale, t, false),
    })),
  ];
  return (
    /*
     * THE REAL PAGE'S WRAPPER, AND IT IS NOT DECORATION. A2.
     *
     * This preview drew the board inside a bare `max-w-3xl`, while
     * `/saved` draws it inside `nf-cat-surface` with a `PageScene` behind the
     * heading. `nf-cat-surface` is what gives every `.nf-card` under it the
     * brand ring and its bloom, so a proof taken off this route showed cards
     * that were DULLER than the ones a person meets, and the scene was absent
     * entirely. A harness that drifts from the page is the same lie as a
     * screenshot of a 404, only quieter.
     */
    <div className="nf-cat-surface mx-auto max-w-3xl">
      <div className="relative">
        <PageScene art="globe-pin" />
        <PageHeader variant="large" title={t.nav.saved} fallback="/preview/f3" />
      </div>
      <SavedBoard items={items} />
    </div>
  );
}
