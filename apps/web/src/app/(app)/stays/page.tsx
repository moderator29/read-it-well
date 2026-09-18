import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { lagosToday } from "@/lib/bookings/schema";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import { StayCategoryRail } from "@/components/app/stays/StayCategoryRail";
import { STAY_KINDS } from "@/components/app/stays/model";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { EmptyState, ICON } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Stays",
  robots: { index: false, follow: false },
};

/**
 * Stays home: the other face of the coin.
 *
 * The Stays side's root, the screen the flip lands on. First light is over the
 * EXISTING catalogue: hotels, shortlets, serviced apartments and villas are
 * already `ListingKind`s with nightly prices, `lib/bookings` already reserves
 * them and `/checkout` already takes the money, so the flip lands somewhere
 * real on day one. The business-grade schema (accommodations, room types,
 * rate plans, inventory) grows underneath this page rather than replacing it.
 *
 * Warmer and more photographic than Property, inside the one token system:
 * the difference is imagery, the glass objects and one rung of accent depth,
 * never a new hue.
 *
 * Rendered per request: the shelf is the live catalogue, not a build.
 */
export const dynamic = "force-dynamic";

/** One read per kind, merged, so the shelf leads with what exists. */
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
  const [stays, tables] = await Promise.all([
    readShelf(STAY_KINDS, 3),
    readShelf(["restaurant"], 3),
  ]);

  return (
    <>
      <section className="nf-rise">
        <h1 className="nf-h1">{t.stays.heroTitle}</h1>
        <p className="nf-body mt-inline-tight max-w-measure-lede text-[var(--nf-content-secondary)]">
          {t.stays.heroLine}
        </p>
        <StaySearchBar t={t} today={lagosToday()} />
      </section>

      <Reveal as="section" className="mt-section-tight">
        <StayCategoryRail t={t} />
      </Reveal>

      <Reveal as="section" className="mt-section-tight">
        <div className="mb-heading flex items-end justify-between gap-md">
          <h2 className="nf-h2">{t.stays.featured}</h2>
          <Link
            href="/stays/search"
            className="nf-link-quiet nf-tap nf-body-sm shrink-0 text-[var(--nf-content-link)]"
          >
            {t.stays.seeAll}
            <UiIcon name="arrow-right" size={ICON.inline} />
          </Link>
        </div>
        {stays.length === 0 ? (
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
          <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {stays.slice(0, 6).map((listing, index) => (
              <li key={listing.id}>
                <ListingCard listing={listing} locale={locale} t={t} index={index} side="stays" />
              </li>
            ))}
          </ul>
        )}
      </Reveal>

      {tables.length > 0 && (
        <Reveal as="section" className="mt-section-tight">
          <div className="mb-heading flex items-end justify-between gap-md">
            <h2 className="nf-h2">{t.stays.tables}</h2>
            <Link
              href="/restaurants"
              className="nf-link-quiet nf-tap nf-body-sm shrink-0 text-[var(--nf-content-link)]"
            >
              {t.stays.seeAll}
              <UiIcon name="arrow-right" size={ICON.inline} />
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {tables.slice(0, 3).map((listing, index) => (
              <li key={listing.id}>
                <ListingCard listing={listing} locale={locale} t={t} index={index} side="stays" />
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </>
  );
}
