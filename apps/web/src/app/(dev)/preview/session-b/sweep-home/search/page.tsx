import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { factsOf } from "@/lib/listings/filter";
import { ShelfBar } from "@/components/app/search/ShelfBar";
import { ShelfCount } from "@/components/app/search/ShelfCount";
import { parseShelfQuery } from "@/components/app/search/shelf-query";
import { ListingCard } from "@/components/app/ListingCard";
import { EXAMPLE_LISTING, SHELF } from "../../../f3/fixtures";
import { SweepFrame } from "../Frame";
import { withListers } from "../lister-fixtures";

/**
 * `/search` from fixture rows (the f3 composition, with the three lister
 * states laid over the rows): the real bar, the real sheet (open on
 * `?filters=open`), the real cards.
 */
export const dynamic = "force-dynamic";

export default async function SweepSearch({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const raw = await searchParams;
  const query = parseShelfQuery({ q: "Lekki, Lagos", ...raw });
  const listings = [...withListers(SHELF), EXAMPLE_LISTING];
  return (
    <SweepFrame route="/search">
      <ShelfBar query={query} facts={listings.map(factsOf)} locale={locale} t={t} openFilters={raw.filters === "open"} />
      <ShelfCount query={query} count={listings.length} narrowed locale={locale} t={t} />
      <ul className="mt-md grid grid-cols-2 gap-sm sm:gap-md lg:grid-cols-4" data-testid="results-grid">
        {listings.map((listing, i) => (
          <li key={listing.id}>
            <ListingCard listing={listing} locale={locale} t={t} index={i} dense />
          </li>
        ))}
      </ul>
    </SweepFrame>
  );
}
