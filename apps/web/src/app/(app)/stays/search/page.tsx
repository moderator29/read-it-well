import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getListingRepository } from "@/lib/listings/repository";
import { factsOf, sleeps } from "@/lib/listings/filter";
import { lagosToday } from "@/lib/bookings/schema";
import type { Listing, ListingKind } from "@/lib/listings/types";
import { ListingCard } from "@/components/app/ListingCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import {
  STAYS_SIDE_KINDS,
  STAY_KINDS,
  readStayDates,
  stayTotalMinor,
  toStaysSearchHref,
} from "@/components/app/stays/model";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Chip, ChipRow } from "@/components/ui/Chip";
import { Amount } from "@/components/ui/Amount";

export const metadata: Metadata = {
  title: "Explore stays",
  robots: { index: false, follow: false },
};

/**
 * Stay search: dates, guests, kind, and the total as the headline.
 *
 * First light over the existing catalogue. The address bar is the contract:
 * `q`, `type` (a stays kind), `checkIn` and `checkOut` as a pair, `guests`,
 * `sort`. With dates chosen every card leads with the total for those nights,
 * fees included, computed by the same arithmetic `reserve()` runs afterwards;
 * without dates it leads with the nightly rate. Guests filter by the host's
 * declared capacity, and a place with no declared capacity is never excluded
 * by it (a restaurant table has no bedrooms to count).
 *
 * The twelve-filter shelf (rating, room type, facilities, breakfast, air
 * conditioning, parking, Wi-Fi, verified, free cancellation, distance from a
 * landmark) lands on the catalogue projection and joins this page as the
 * filter drawer; nothing here pretends to filter what it cannot yet read.
 */
export const dynamic = "force-dynamic";

type SortKey = "recommended" | "price-asc" | "price-desc" | "top-rated";
const SORT_KEYS: SortKey[] = ["recommended", "price-asc", "price-desc", "top-rated"];

function readKind(value: string | string[] | undefined): ListingKind | undefined {
  if (typeof value !== "string") return undefined;
  return (STAYS_SIDE_KINDS as readonly string[]).includes(value) ? (value as ListingKind) : undefined;
}

function readSort(value: string | string[] | undefined): SortKey {
  return typeof value === "string" && (SORT_KEYS as string[]).includes(value)
    ? (value as SortKey)
    : "recommended";
}

function readText(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

export default async function StaysSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const params = await searchParams;
  const q = readText(params.q);
  const type = readKind(params.type);
  const sort = readSort(params.sort);
  const dates = readStayDates(params);
  const today = lagosToday();

  const repo = getListingRepository();
  const kinds: readonly ListingKind[] = type ? [type] : STAY_KINDS;
  const groups = await Promise.all(kinds.map((kind) => repo.search({ kind, q: q || undefined })));
  const seen = new Set<string>();
  let results: Listing[] = [];
  for (const group of groups) {
    for (const listing of group) {
      if (!seen.has(listing.id)) {
        seen.add(listing.id);
        results.push(listing);
      }
    }
  }

  /* Party size against declared capacity; unknown capacity never excludes. */
  results = results.filter((listing) => {
    const capacity = sleeps(factsOf(listing));
    return capacity === null || capacity >= dates.guests;
  });

  const totalOf = (listing: Listing) =>
    dates.nights ? stayTotalMinor(listing, dates.nights) : null;
  const priceOf = (listing: Listing) => totalOf(listing) ?? listing.priceMinor;
  if (sort === "price-asc") results.sort((a, b) => priceOf(a) - priceOf(b));
  if (sort === "price-desc") results.sort((a, b) => priceOf(b) - priceOf(a));
  if (sort === "top-rated") results.sort((a, b) => b.rating - a.rating);

  const carried = { q: q || undefined, checkIn: dates.checkIn, checkOut: dates.checkOut, guests: dates.guests };
  const kindChips: { label: string; kind?: ListingKind }[] = [
    { label: t.stays.resultsTitle },
    { label: t.stays.hotels, kind: "hotel" },
    { label: t.stays.shortlets, kind: "shortlet" },
    { label: t.stays.serviced, kind: "apartment" },
    { label: t.stays.resorts, kind: "villa" },
  ];
  const countLine = dates.nights
    ? t.stays.resultsForDates
        .replace("{count}", String(results.length))
        .replace("{nights}", String(dates.nights))
    : t.stays.resultsCount.replace("{count}", String(results.length));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.nav.exploreStays} subtitle={countLine} fallback="/stays" />

      <StaySearchBar
        t={t}
        q={q}
        checkIn={dates.checkIn}
        checkOut={dates.checkOut}
        guests={dates.guests}
        type={type}
        today={today}
        compact
      />

      <div className="mt-block flex flex-wrap items-center justify-between gap-inline">
        <ChipRow>
          {kindChips.map((chip) => (
            <Chip
              key={chip.label}
              behaviour="link"
              href={toStaysSearchHref({ ...carried, type: chip.kind, sort })}
              selected={chip.kind === type}
            >
              {chip.label}
            </Chip>
          ))}
        </ChipRow>
        <div className="flex items-center gap-2xs">
          <span className="nf-caption text-[var(--nf-content-muted)]">{t.stays.sortLabel}</span>
          <ChipRow>
            {(
              [
                ["recommended", t.stays.sortRecommended],
                ["price-asc", t.stays.sortPriceAsc],
                ["price-desc", t.stays.sortPriceDesc],
                ["top-rated", t.stays.sortRating],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Chip
                key={key}
                size="sm"
                behaviour="link"
                href={toStaysSearchHref({ ...carried, type, sort: key })}
                selected={key === sort}
              >
                {label}
              </Chip>
            ))}
          </ChipRow>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="hotel"
          title={t.stays.emptyTitle}
          body={t.stays.emptyBody}
          action={
            dates.nights ? (
              <ButtonLink href={toStaysSearchHref({ q: q || undefined, type })} variant="primary">
                {t.stays.clearDates}
              </ButtonLink>
            ) : (
              <ButtonLink href="/stays" variant="primary">
                {t.nav.stays}
              </ButtonLink>
            )
          }
          className="mt-section-tight"
        />
      ) : (
        <ul className="mt-block grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {results.map((listing, index) => {
            const total = totalOf(listing);
            return (
              <li key={listing.id} className="flex flex-col gap-2xs">
                <ListingCard listing={listing} locale={locale} t={t} index={index} side="stays" />
                {total !== null && dates.nights ? (
                  /* THE TOTAL IS THE HEADLINE. One line under the card: what
                     these nights cost, everything included, the same number
                     checkout will ask for. */
                  <Link
                    href={`/stay/${listing.id}?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}&guests=${dates.guests}`}
                    className="nf-tap flex items-baseline justify-between gap-inline px-row"
                  >
                    <span className="nf-caption text-[var(--nf-content-muted)]">
                      {t.stays.totalForNights.replace("{nights}", String(dates.nights))}
                    </span>
                    <Amount minorUnits={total} locale={locale} className="nf-numeric font-semibold" />
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
