import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingCard } from "@/components/app/ListingCard";
import { StayCard } from "@/components/app/stays/StayCard";
import { SavedBoard, type SavedBoardItem } from "@/app/(app)/saved/SavedBoard";
import { RESTAURANTS, SHELF, STAYS } from "../fixtures";

/**
 * /saved with all three shelves on one board: two saved listings, a saved
 * stay and a saved restaurant. The stays come through the same `StayCard`
 * the shelf and the search use, hearted and lit, because `saved_places` now
 * has a reader (`getSavedPlaces`) as well as its writes.
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
      card: (
        <StayCard
          stay={{ ...stay, place: { kind: "accommodation", id: stay.id } }}
          locale={locale}
          t={t}
          saved
          canSavePlaces
        />
      ),
    },
    {
      id: table.id,
      mode: "db",
      savedAt: 1_789_699_000,
      place: { kind: "restaurant", id: table.id },
      card: (
        <StayCard
          stay={{ ...table, place: { kind: "restaurant", id: table.id } }}
          locale={locale}
          t={t}
          saved
          canSavePlaces
        />
      ),
    },
    ...SHELF.slice(0, 2).map<SavedBoardItem>((listing, i) => ({
      id: listing.id,
      mode: "local",
      savedAt: 1_789_698_000 - i * 60,
      card: <ListingCard listing={listing} locale={locale} t={t} />,
    })),
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.nav.saved} fallback="/preview/f3" />
      <SavedBoard items={items} />
    </div>
  );
}
