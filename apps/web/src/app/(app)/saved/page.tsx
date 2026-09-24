import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { ListingCard } from "@/components/app/ListingCard";
import { StayCard } from "@/components/app/stays/StayCard";
import { stayCardFromRow } from "@/components/app/stays/stay-card-model";
import { SAVED_COOKIE, parseSavedCookie } from "@/lib/saved/keys";
import { getSavedListings, getSavedPlaces } from "@/lib/saved/queries";
import { SavedBoard, type SavedBoardItem } from "./SavedBoard";
import { ShelfSync } from "./ShelfSync";
import { resolveSession } from "@/lib/actions/session";
import { shelfFromListing } from "@/lib/offline/shelf";

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
 *
 * ---------------------------------------------------------------------------
 * THE OTHER TWO SHELVES, WHICH HAD ACTIONS AND NO SCREEN.
 *
 * `saved_places` has held the Stays side since M13 and the writes have existed
 * for as long, so a person could heart a hotel or a restaurant and then find
 * NOTHING on this page: the read was never called here, so the save was real,
 * private and invisible. `getSavedPlaces` is that read, under the account's own
 * RLS, handing each row back as a `StaySearchRow` so `stayCardFromRow` draws a
 * saved stay with exactly the card that draws a searched one.
 *
 * SAVED LISTINGS ARE NOT IN THAT READ, deliberately: they are `saved_items`,
 * which `getSavedListings` above already resolves along with the device half.
 * Reading the listing kind out of `saved_places` as well would draw some
 * properties twice and neither shelf could say which heart was which.
 *
 * The two lists interleave by `savedAt`, which is epoch seconds on both sides,
 * so the board is one shortlist in the order the person built it rather than
 * two piles with a heading between them.
 */
export default async function SavedPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const cookieStore = await cookies();
  const [entries, places, session] = await Promise.all([
    getSavedListings(parseSavedCookie(cookieStore.get(SAVED_COOKIE)?.value)),
    getSavedPlaces(),
    resolveSession(),
  ]);
  /* V-77: the phone's shelf is kept for one account at a time. */
  const owner = session.state === "signed-in" ? session.user.id : null;

  /* The copies are built here, from the same rows the cards draw, so the
     phone's copy cannot disagree with the card. */
  const shelf = shelfCopies(entries.map((entry) => entry.listing));

  const items: SavedBoardItem[] = [
    ...entries.map<SavedBoardItem>((entry) => ({
      id: entry.listing.id,
      mode: entry.mode,
      savedAt: entry.savedAt,
      /* IT IS ON THE SHORTLIST, SO THE HEART IS FILLED. Every row on this
         board is saved by definition, and the card used to draw the heart
         from the device store alone: a signed-in reader whose save went to
         `saved_items` saw an empty heart beside the `StayCard` half's filled
         one, on the same screen. `entry.mode` says which half resolved it
         and both mean saved. (R2 finding 4.) */
      card: <ListingCard listing={entry.listing} locale={locale} t={t} saved />,
    })),
    ...places.map<SavedBoardItem>((entry) => ({
      id: entry.row.entity_id,
      /* A row under RLS, never the device: `saved_places` has no local mirror
         and this page is signed-in only (`proxy.ts` sends a stranger to
         /sign-in), so the mode is the truth rather than a fallback. */
      mode: "db",
      savedAt: entry.savedAt,
      place: { kind: entry.kind === "restaurant" ? "restaurant" : "accommodation", id: entry.row.entity_id },
      card: (
        <StayCard
          stay={stayCardFromRow(entry.row)}
          locale={locale}
          t={t}
          saved
          canSavePlaces
        />
      ),
    })),
  ].sort((a, b) => b.savedAt - a.savedAt);

  return (
    <div className="nf-cat-surface mx-auto max-w-3xl">
      <div className="relative">
        <PageScene art="globe-pin" />
      {/* The saved SEARCHES live one tap from the saved places, because they
          are the same idea kept in two shapes and because a person with none
          of them yet has no other way to reach that screen and read what it
          is for. */}
      <PageHeader
        title={t.nav.saved}
        actions={
          <Link
            href="/saved/searches"
            prefetch
            className="nf-link-quiet nf-body-sm text-[var(--nf-content-link)]"
            data-testid="saved-searches-link"
          >
            Saved searches
          </Link>
        }
      />
      </div>
      {/* V-77: the saved listings, copied to the phone for when there is no
          signal, and any figure that moved since it was first copied. */}
      {owner && <ShelfSync owner={owner} items={shelf} copy={t.platform.shelf} locale={locale} />}
      <SavedBoard items={items} />
    </div>
  );
}

/** V-77: the phone's copies, stamped with the time of the read, not a render. */
function shelfCopies(listings: Parameters<typeof shelfFromListing>[0][]) {
  const readAt = Date.now();
  return listings.map((listing) => shelfFromListing(listing, readAt));
}
