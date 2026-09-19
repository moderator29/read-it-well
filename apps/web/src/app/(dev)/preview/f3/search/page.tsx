import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { factsOf } from "@/lib/listings/filter";
import { ShelfBar } from "@/components/app/search/ShelfBar";
import { ShelfCount } from "@/components/app/search/ShelfCount";
import { parseShelfQuery } from "@/components/app/search/shelf-query";
import { ListingCard } from "@/components/app/ListingCard";
import { EXAMPLE_LISTING, SHELF } from "../fixtures";

/**
 * /search with fixture rows: the real bar, the real sheet (open on
 * `?filters=open`), the real cards. The query is read from the address so
 * the chips and the sheet reflect it exactly as the route does.
 */
export default async function SearchPreview({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const raw = await searchParams;
  const query = parseShelfQuery({ q: "Lekki, Lagos", ...raw });
  const listings = [...SHELF, EXAMPLE_LISTING];

  return (
    <>
      <ShelfBar
        query={query}
        facts={listings.map(factsOf)}
        locale={locale}
        t={t}
        openFilters={raw.filters === "open"}
      />
      <ShelfCount query={query} count={listings.length} narrowed locale={locale} t={t} />
      <ul className="mt-md grid grid-cols-2 gap-sm sm:gap-md lg:grid-cols-4" data-testid="results-grid">
        {listings.map((listing, i) => (
          <li key={listing.id}>
            <ListingCard listing={listing} locale={locale} t={t} index={i} dense />
          </li>
        ))}
      </ul>
    </>
  );
}
