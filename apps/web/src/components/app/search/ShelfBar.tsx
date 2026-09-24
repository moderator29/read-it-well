import Link from "next/link";
import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { FilterDrawer } from "@/components/app/filters/FilterDrawer";
import type { ListingFacts } from "@/lib/listings/filter";
import type { Anchor } from "@/lib/listings/commute";
import { kindLabel } from "@/lib/listings/search-params";
import { ICON } from "@/components/app/Screen";
import {
  MARKET_PARAM,
  shelfActiveCount,
  toShelfFiltersHref,
  toShelfHref,
  type ShelfQuery,
} from "./shelf-query";

/**
 * The top of the results shelf, to 3EB3E2A9: the glass field with its
 * filter square, then the capsule row that reads the real filter state
 * back. Every capsule opens the sheet, because the sheet is where each of
 * them is changed; the words on them are the address bar's, so a shared link
 * shows the same chips.
 */
function carriedParams(query: ShelfQuery): [string, string][] {
  const href = toShelfHref(query);
  const index = href.indexOf("?");
  if (index === -1) return [];
  return [...new URLSearchParams(href.slice(index + 1))].filter(([key]) => key !== "q");
}

export function ShelfBar({
  query,
  facts,
  locale,
  t,
  openFilters = false,
  leading,
  anchors = [],
}: {
  query: ShelfQuery;
  facts: ListingFacts[];
  locale: Locale;
  t: Dictionary;
  openFilters?: boolean;
  /**
   * A control placed before the search field, on the bar's own row.
   *
   * `/search` puts the platform's back control here and it is the only caller
   * that does. The route declares `/home` above it in
   * `lib/nav/route-parents.ts` and drew nothing, and nothing could be drawn
   * ABOVE this component either: the bar is `position: sticky; top: 0` and
   * cancels the shell's top padding with a negative margin, so anything
   * inserted before it stops being flush with the header and starts scrolling
   * under it. The row is therefore where the control belongs, which is also
   * where a phone's search screen puts it.
   *
   * A slot rather than a fixed control, so the preview deck that mounts this
   * bar with fixtures is not given a back arrow it did not ask for.
   */
  leading?: React.ReactNode;
  /** V-43: the anchors a renter can pick; none means the group is not drawn. */
  anchors?: Anchor[];
}) {
  const copy = t.catalogue.shelf;
  const sheetHref = toShelfFiltersHref(query);

  /* A category names itself first; the rent market names itself when no
     category narrows it (V-26: `/rent` lands here as `market=rent`, and the
     chip said "Any market" over a shelf of tenancies). */
  const marketLabel =
    query.intent === "sale"
      ? "Buy"
      : query.kind
        ? kindLabel(query.kind)
        : query.intent === "rent"
          ? t.shape.market.rent
          : copy.anyMarket;
  const bedsLabel =
    query.bedrooms !== undefined ? copy.beds.replace("{count}", String(query.bedrooms)) : copy.bedsAny;
  const priceLabel =
    query.minMinor !== undefined && query.maxMinor !== undefined
      ? `${formatMoney(query.minMinor, locale)} to ${formatMoney(query.maxMinor, locale)}`
      : query.minMinor !== undefined
        ? `${formatMoney(query.minMinor, locale)}+`
        : query.maxMinor !== undefined
          ? `${copy.price} to ${formatMoney(query.maxMinor, locale)}`
          : copy.price;
  const shown =
    (query.intent || query.kind ? 1 : 0) +
    (query.bedrooms !== undefined ? 1 : 0) +
    (query.minMinor !== undefined || query.maxMinor !== undefined ? 1 : 0);
  const more = Math.max(0, shelfActiveCount(query) + (query.kind ? 1 : 0) - shown);

  const chips: { key: string; label: string; icon: "home" | "bed" | "wallet" | "sliders"; on: boolean }[] = [
    { key: "market", label: marketLabel, icon: "home", on: Boolean(query.intent || query.kind) },
    { key: "beds", label: bedsLabel, icon: "bed", on: query.bedrooms !== undefined },
    {
      key: "price",
      label: priceLabel,
      icon: "wallet",
      on: query.minMinor !== undefined || query.maxMinor !== undefined,
    },
    { key: "more", label: more > 0 ? `${copy.more} (${more})` : copy.more, icon: "sliders", on: more > 0 },
  ];

  return (
    <div className="nf-shelf-bar nf-glass--chrome">
      <div className="mx-auto flex max-w-3xl items-center gap-inline">
        {leading}
        <form action="/search" method="get" role="search" className="nf-shelf-field">
          <UiIcon name="search" size={ICON.inline} />
          <label htmlFor="shelf-q" className="sr-only">
            {copy.search}
          </label>
          <input
            id="shelf-q"
            name="q"
            type="search"
            autoComplete="off"
            defaultValue={query.q ?? ""}
            placeholder={copy.searchPlaceholder}
            className="nf-shelf-field__input"
          />
          {/* Typing a new search must not silently drop the filters set. */}
          {carriedParams(query).map(([key, value]) => (
            <input key={key} type="hidden" name={key === MARKET_PARAM ? MARKET_PARAM : key} value={value} />
          ))}
          <button type="submit" aria-label={copy.search} className="nf-shelf-field__go">
            <UiIcon name="arrow-right" size={ICON.inline} />
          </button>
        </form>
        <FilterDrawer
          query={query}
          facts={facts}
          locale={locale}
          copy={t.catalogue.filters}
          costCopy={t.moveIn}
          compoundCopy={t.shape.compound}
          sortCopy={t.shape.sorts}
          serviceCopy={t.shape.service}
          cashCopy={t.shape.cash}
          unitCopy={t.shape.unit}
          anchors={anchors}
          commuteCopy={t.shape.commute}
          feesBasis={t.trustVisible.fees.sortBasis}
          openOnMount={openFilters}
        />
      </div>

      <nav aria-label={copy.filters} className="nf-shelf-chips nf-scroll-x mt-sm">
        {chips.map((chip) => (
          <Link
            key={chip.key}
            href={sheetHref}
            prefetch={false}
            data-testid={`shelf-chip-${chip.key}`}
            className={`nf-shelf-chip ${chip.on ? "nf-shelf-chip--on" : ""}`}
          >
            <UiIcon name={chip.icon} size={16} />
            {chip.label}
            <UiIcon name="chevron-down" size={14} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
