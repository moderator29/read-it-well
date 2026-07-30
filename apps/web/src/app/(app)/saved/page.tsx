import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ListingCard } from "@/components/app/ListingCard";
import { SAVED_COOKIE, parseSavedCookie } from "@/lib/saved/keys";
import { getSavedListings } from "@/lib/saved/queries";
import { SavedBoard, type SavedBoardItem } from "./SavedBoard";

export const metadata: Metadata = { title: "Saved" };

/**
 * Saved.
 *
 * The shortlist: every place this account has hearted, kept together and ready
 * to compare or book. Rows in public.saved_items are the account's truth and
 * are read under its own policy; places hearted before signing in, and every
 * catalogue place, ride along from the device mirror so nothing a guest tapped
 * is ever quietly dropped.
 *
 * Cards are rendered here on the server with the same `ListingCard` discovery
 * uses, so the shortlist looks identical to search and the client only carries
 * the heart and the undo chip.
 */
export default async function SavedPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const cookieStore = await cookies();
  const entries = await getSavedListings(
    parseSavedCookie(cookieStore.get(SAVED_COOKIE)?.value),
  );

  const items: SavedBoardItem[] = entries.map((entry) => ({
    id: entry.listing.id,
    mode: entry.mode,
    savedAt: entry.savedAt,
    card: <ListingCard listing={entry.listing} locale={locale} t={t} />,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t.nav.saved} />
      <SavedBoard items={items} />
    </div>
  );
}
