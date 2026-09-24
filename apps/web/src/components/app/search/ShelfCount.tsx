import Link from "next/link";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SORTS, sortBasisOf } from "@/lib/listings/search-params";
import { ViewToggle } from "@/components/app/filters/ViewToggle";
import { toShelfHref, toShelfViewHref, type ShelfQuery } from "./shelf-query";

/**
 * "342 properties found" and the sort control beside it, to 3EB3E2A9.
 *
 * The count is a live region so a screen reader hears a filter land. The
 * sort is a native disclosure of links: an ordering stays a URL the back
 * button can walk, and nothing has to hydrate for the menu to open.
 */
export function ShelfCount({
  query,
  count,
  narrowed,
  locale,
  t,
}: {
  query: ShelfQuery;
  count: number;
  narrowed: boolean;
  locale: Locale;
  t: Dictionary;
}) {
  const copy = t.catalogue.shelf;
  const current = SORTS.find((sort) => sort.key === query.sort) ?? SORTS[0]!;
  const currentBasis = sortBasisOf(query.sort);
  const basis =
    currentBasis === "price"
      ? t.moveIn.basisPrice
      : currentBasis === "move-in"
        ? t.moveIn.basisMoveIn
        : currentBasis === "listed"
          ? t.shape.listed.basis
          : currentBasis === "fees"
            ? t.trustVisible.fees.sortBasis
          : null;
  const line =
    count === 0
      ? narrowed
        ? copy.foundNone
        : ""
      : count === 1
        ? copy.foundOne
        : copy.found.replace("{count}", formatNumber(count, locale));

  return (
    <div className="nf-shelf-count">
      <div className="min-w-0">
        <p
          data-testid="results-count"
          data-count={count}
          aria-live="polite"
          aria-atomic="true"
          className="nf-body-sm min-w-0 whitespace-nowrap font-medium text-[var(--nf-content-secondary)]"
        >
          {line}
        </p>
        {/*
          WHICH NUMBER THIS ORDER IS ON, SAID OUT LOUD.

          HANDOFF 09 section 4.2: "a silent switch between two bases is worse
          than either one alone". The shelf can now order on the headline price
          or on the total move-in cost, and those are different money, so the
          one in force is printed rather than left to be inferred from a label
          in a menu the reader has closed. Only for the two money orders: a
          rating order and the opening order are not claims about a price.
        */}
        {basis && (
          <p data-testid="sort-basis" className="nf-caption truncate text-[var(--nf-content-muted)]">
            {basis}
          </p>
        )}
        {/* V-06: Recommended is a published formula, one tap away, and the
            promise that nobody can pay to move it is said where the order is. */}
        {query.sort === "recommended" && count > 1 && (
          <p data-testid="sort-basis" className="nf-caption text-[var(--nf-content-muted)]">
            {t.trustVisible.ranking.shelfLine}{" "}
            <Link href="/standards#ranking" className="font-semibold text-[var(--nf-content-secondary)] underline">
              {t.trustVisible.ranking.shelfLink}
            </Link>
          </p>
        )}
      </div>
      {/* One control on the right, as the image draws it. The map view is
          the last item of the same menu rather than a second control that
          would push the count onto three lines at 390px. */}
      {(count > 1 || query.view === "map") && (
        <details className="nf-shelf-sort shrink-0" data-testid="sort-control">
          <summary>
            <UiIcon name="sliders" size={14} />
            {t.shape.sorts[current.key]}
            <UiIcon name="chevron-down" size={14} />
          </summary>
          <ul className="nf-shelf-sort__menu" aria-label={copy.sort}>
            {SORTS.map((sort) => {
              const active = sort.key === query.sort;
              return (
                <li key={sort.key}>
                  <Link
                    href={toShelfHref({ ...query, sort: sort.key })}
                    prefetch
                    aria-current={active ? "true" : undefined}
                    className="nf-shelf-sort__item"
                  >
                    {t.shape.sorts[sort.key]}
                    {active && <UiIcon name="verified" size={14} />}
                  </Link>
                </li>
              );
            })}
            <li className="mt-2xs border-t border-[var(--nf-panel-hair)] pt-2xs">
              <ViewToggle current={query.view} hrefFor={(view) => toShelfViewHref(query, view)} />
            </li>
          </ul>
        </details>
      )}
    </div>
  );
}
