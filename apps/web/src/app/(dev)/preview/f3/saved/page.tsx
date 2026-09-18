import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingCard } from "@/components/app/ListingCard";
import { SavedBoard, type SavedBoardItem } from "@/app/(app)/saved/SavedBoard";
import { SHELF } from "../fixtures";

/** /saved with three fixture cards on the board. */
export default async function SavedPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const items: SavedBoardItem[] = SHELF.slice(0, 3).map((listing, i) => ({
    id: listing.id,
    mode: "local",
    savedAt: 1_789_700_000_000 - i * 60_000,
    card: <ListingCard listing={listing} locale={locale} t={t} />,
  }));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.nav.saved} fallback="/preview/f3" />
      <SavedBoard items={items} />
    </div>
  );
}
