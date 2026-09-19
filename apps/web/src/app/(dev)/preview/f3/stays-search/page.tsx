import { formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { lagosToday, parseStaysQuery } from "@/lib/stays/filters";
import { PageHeader } from "@/components/app/PageHeader";
import { StayCard } from "@/components/app/stays/StayCard";
import { StaySearchBar } from "@/components/app/stays/StaySearchBar";
import { StayCategoryTiles } from "@/components/app/stays/StayCategoryTiles";
import { StayFilterSheet } from "@/components/app/stays/StayFilterSheet";
import { STAYS } from "../fixtures";

/**
 * /stays/search with the fixture shelf: the real bar, the real sheet over
 * BB's twelve filters (open on `?filters=open`), the category tiles and the
 * cards. The query is read from the address exactly as the route reads it,
 * so a chip or a switch set here shows in the sheet the way it would live.
 */
export default async function StaysSearchPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.stays;
  const params = await searchParams;
  const today = lagosToday();
  const query = parseStaysQuery(params, today);
  const type = typeof params.type === "string" ? params.type : undefined;
  const stays = STAYS;
  const countLine = copy.results.replace("{count}", formatNumber(stays.length, locale));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.nav.exploreStays} subtitle={countLine} fallback="/preview/f3/stays" />
      <StaySearchBar
        t={t}
        q={query.q ?? ""}
        carried={{ type }}
        filtersControl={
          <StayFilterSheet
            query={query}
            locale={locale}
            t={t}
            today={today}
            basePath="/preview/f3/stays-search"
            extra={{ type }}
            openOnMount={params.filters === "open"}
          />
        }
      />
      <div className="mt-md">
        <StayCategoryTiles t={t} active={type} />
      </div>
      <ul className="mt-block grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3" data-testid="stay-results">
        {stays.map((stay, index) => (
          <li key={stay.id}>
            <StayCard stay={stay} locale={locale} t={t} index={index} />
          </li>
        ))}
      </ul>
    </div>
  );
}
