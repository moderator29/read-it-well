import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { listStaysShelf } from "@/lib/stays/queries";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { StayCard } from "@/components/app/stays/StayCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import { StayCategoryTiles } from "@/components/app/stays/StayCategoryTiles";
import { STAY_KINDS } from "@/components/app/stays/model";
import { stayCardFromListing, stayCardFromRow, type StayCardData } from "@/components/app/stays/stay-card-model";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EmptyState, ICON } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { resolveSession } from "@/lib/actions/session";
import { listSavedPlaces } from "@/lib/saved/places-actions";
import { getSavedListings } from "@/lib/saved/queries";
import { isSaved, savedKeySet } from "@/lib/saved/places";

export const metadata: Metadata = {
  title: "Stays",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Stays home, to FD3DFE84: the headline with the glass hotel object, the
 * "Where are you going?" field with its filter glyph, the five category
 * tiles, and the featured cards.
 *
 * The featured shelf reads BB's catalogue projection first (`stays_search`
 * through `listStaysShelf`, which carries accommodations as well as
 * listings) and falls back to the listing repository, so the shelf is never
 * empty while one read has rows and the other does not.
 */
async function readShelf(kinds: readonly ListingKind[], perKind: number): Promise<Listing[]> {
  const repo = getListingRepository();
  const rows = await Promise.all(kinds.map((kind) => repo.search({ kind }, { limit: perKind })));
  const seen = new Set<string>();
  const merged: Listing[] = [];
  for (let i = 0; i < perKind; i += 1) {
    for (const group of rows) {
      const listing = group[i];
      if (listing && !seen.has(listing.id)) {
        seen.add(listing.id);
        merged.push(listing);
      }
    }
  }
  return merged;
}

export default async function StaysHomePage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;

  /*
   * THE HEARTS ARE LIT FROM THE ACCOUNT'S OWN SHORTLIST.
   *
   * `saved_places` is where a hotel or a restaurant is saved and nothing on
   * this shelf read it, so a stay the reader had already hearted came back
   * every visit with an empty heart on it. `listSavedPlaces` answers with the
   * keys alone; `savedKeySet` and `isSaved` decide each card with no second
   * read per card. Signed out there is no shelf to write to at all, which is
   * what `canSavePlaces` carries to the card: the heart is absent rather than
   * present and refusing.
   */
  const [projection, tables, session, savedPlaces, savedListings] = await Promise.all([
    listStaysShelf({}, 6),
    readShelf(["restaurant"], 3),
    resolveSession(),
    listSavedPlaces(),
    /* The restaurants rail is built from `Listing` rows, not from the
       catalogue projection, so its hearts write to `saved_items` and the
       place keys above cannot answer them. Both shelves are read because
       this one page draws cards from both tables. (R2 finding 4.) */
    getSavedListings(),
  ]);
  const savedKeys = savedKeySet(savedPlaces.ok ? savedPlaces.data : []);
  const savedListingIds = new Set(savedListings.map((entry) => entry.listing.id));
  const canSavePlaces = session.state === "signed-in";
  const featured: StayCardData[] =
    projection.length > 0
      ? projection.filter((row) => row.entity_kind !== "restaurant").map(stayCardFromRow)
      : (await readShelf(STAY_KINDS, 3)).map((listing) => stayCardFromListing(listing));

  return (
    <>
      <section className="nf-rise nf-stays-hero">
        <div className="min-w-0">
          <h1 className="nf-h1">{copy.title}</h1>
          <p className="nf-body mt-inline-tight max-w-measure-lede text-[var(--nf-content-secondary)]">
            {copy.lede}
          </p>
        </div>
        <span className="nf-stays-hero__object" aria-hidden="true">
          <BrandIcon name="hotel" fill priority />
        </span>
      </section>

      <div className="mt-md">
        <StaySearchBar t={t} filtersHref="/stays/search?filters=open" />
      </div>

      <Reveal as="section" className="mt-md">
        <StayCategoryTiles t={t} />
      </Reveal>

      <Reveal as="section" className="mt-section-tight">
        <div className="mb-heading flex items-end justify-between gap-md">
          <h2 className="nf-h3">{copy.featured}</h2>
          <Link
            href="/stays/search"
            className="nf-link-quiet nf-tap nf-body-sm shrink-0 text-[var(--nf-content-link)]"
          >
            {copy.seeAll}
            <UiIcon name="arrow-right" size={ICON.inline} />
          </Link>
        </div>
        {featured.length === 0 ? (
          <EmptyState
            icon="hotel"
            title={t.stays.shelfEmptyTitle}
            body={t.stays.shelfEmptyBody}
            action={
              <ButtonLink href="/stays/search" variant="primary">
                {t.stays.findStay}
              </ButtonLink>
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3" data-testid="featured-stays">
            {featured.slice(0, 6).map((stay, index) => (
              <li key={stay.id}>
                <StayCard
                  stay={stay}
                  locale={locale}
                  t={t}
                  index={index}
                  saved={stay.place ? isSaved(savedKeys, stay.place.kind, stay.place.id) : false}
                  canSavePlaces={canSavePlaces}
                />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {tables.length > 0 && (
        <Reveal as="section" className="mt-section-tight">
          <div className="mb-heading flex items-end justify-between gap-md">
            <h2 className="nf-h3">{t.stays.tables}</h2>
            <Link
              href="/restaurants"
              className="nf-link-quiet nf-tap nf-body-sm shrink-0 text-[var(--nf-content-link)]"
            >
              {copy.seeAll}
              <UiIcon name="arrow-right" size={ICON.inline} />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {tables.slice(0, 3).map((listing, index) => (
              <li key={listing.id}>
                {/* The href override is gone: `stayCardFromListing` reads it
                    from the kind now, so a restaurant lands on
                    `/restaurant/<id>` wherever it is drawn rather than only
                    where somebody remembered to say so. The heart takes the
                    stored truth, which this rail was not passing at all, so a
                    hearted table came back unlit. (R2 findings 1 and 4.) */}
                <StayCard
                  stay={stayCardFromListing(listing)}
                  locale={locale}
                  t={t}
                  index={index}
                  saved={savedListingIds.has(listing.id)}
                />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </>
  );
}
