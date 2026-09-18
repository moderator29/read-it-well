import type { Metadata } from "next";
import { formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { lagosToday, parseStaysQuery, toStaysHref, type StaysQuery } from "@/lib/stays/filters";
import { searchStays } from "@/lib/stays/search";
import { narrowByType, readType } from "./narrow";
import { StayCard } from "@/components/app/stays/StayCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import { StayCategoryTiles } from "@/components/app/stays/StayCategoryTiles";
import { StayFilterSheet } from "@/components/app/stays/StayFilterSheet";
import { stayCardFromRow } from "@/components/app/stays/stay-card-model";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Explore stays",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Stay search on BB's twelve filters.
 *
 * `parseStaysQuery` reads the address bar, `searchStays` asks the projection
 * once (every filter is carried inside the SQL function, so the page is
 * complete and `total` is true), and the sheet mirrors the property one over
 * the same query. The category tiles add one parameter the projection does
 * not filter on yet, `type`, which narrows the returned page by its `kind`
 * column; a seam, reported, until `StaysQuery` carries a kind of its own.
 */
export default async function StaysSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;
  const params = await searchParams;
  const today = lagosToday();
  const query: StaysQuery = parseStaysQuery(params, today);
  const type = readType(params.type);

  const result = await searchStays(query);
  const rows = narrowByType(result.rows, type);
  const total = type ? rows.length : result.total;
  const stays = rows.map(stayCardFromRow);

  const countLine =
    total === 0 ? copy.resultsNone : total === 1 ? copy.resultsOne : copy.results.replace("{count}", formatNumber(total, locale));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.nav.exploreStays} subtitle={countLine} fallback="/stays" />

      <StaySearchBar
        t={t}
        q={query.q ?? ""}
        carried={{ type, in: query.checkIn, out: query.checkOut, guests: query.guests ? String(query.guests) : undefined }}
        filtersControl={
          <StayFilterSheet
            query={query}
            locale={locale}
            t={t}
            today={today}
            extra={{ type }}
            openOnMount={params.filters === "open"}
          />
        }
      />

      <div className="mt-md">
        <StayCategoryTiles t={t} active={type} />
      </div>

      {/* A landmark the projection did not recognise is said, not hidden. */}
      {query.near && !result.near && (
        <p role="status" className="nf-caption mt-md text-[var(--nf-content-muted)]">
          {copy.nearMissed.replace("{term}", query.near)}
        </p>
      )}

      {stays.length === 0 ? (
        <EmptyState
          icon="hotel"
          title={t.stays.emptyTitle}
          body={t.stays.emptyBody}
          action={
            query.checkIn ? (
              <ButtonLink href={toStaysHref({ ...query, checkIn: undefined, checkOut: undefined }, "/stays/search")} variant="primary">
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
        <ul className="mt-block grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3" data-testid="stay-results">
          {stays.map((stay, index) => (
            <li key={`${stay.id}-${index}`}>
              <StayCard stay={stay} locale={locale} t={t} index={index} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
