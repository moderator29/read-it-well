import type { Dictionary, Locale } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import type { DemandRow } from "@/lib/demand/queries";
import { demandCounts, demandWhat } from "@/lib/demand/words";

/**
 * V-10: THE DEMAND BOARD PANEL, for the lister's analytics and the supply
 * desk. What renters looked for over four weeks, by neighbourhood, with how
 * often they came up short and what real supply Vallo holds that fits. Every
 * line is a cell of at least five searches (the database applies the
 * threshold); nothing on it can describe one person.
 *
 * Its three states: unavailable (said plainly), empty (the honest state until
 * search volume exists, and what almost everybody sees today), and the list.
 */
export function DemandBoard({
  rows,
  copy,
  locale,
  listHref,
}: {
  rows: DemandRow[] | null | "approved_only";
  copy: Dictionary["frontDoor"]["demand"];
  locale: Locale;
  /** Where "List a home that fits" goes; omitted on the staff desk. */
  listHref?: string;
}) {
  return (
    <section className="nf-panel nf-panel--card mt-lg p-card-sm" aria-labelledby="demand-board-title" data-testid="demand-board">
      <h2 id="demand-board-title" className="nf-h4 text-[var(--nf-content-primary)]">
        {copy.title}
      </h2>
      <p className="mt-inline nf-body-sm text-[var(--nf-content-secondary)]">{copy.lede}</p>
      {rows === "approved_only" ? (
        <p className="mt-group nf-body-sm text-[var(--nf-content-muted)]" data-testid="demand-approved-only">
          {copy.approvedOnly}
        </p>
      ) : rows === null ? (
        <p className="mt-group nf-body-sm text-[var(--nf-content-muted)]" data-testid="demand-unavailable">
          {copy.unavailable}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-group nf-body-sm text-[var(--nf-content-muted)]" data-testid="demand-empty">
          {copy.empty}
        </p>
      ) : (
        <ul className="mt-group flex flex-col gap-row" data-testid="demand-rows">
          {rows.map((row) => (
            <li
              key={`${row.stateCode}-${row.areaKey}-${row.market}-${row.bedroomsMin}-${row.budgetBand}`}
              className="border-t border-[var(--nf-border-subtle)] pt-row first:border-t-0 first:pt-0"
            >
              <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{demandWhat(row, copy, locale)}</p>
              <p className="mt-inline-tight nf-body-sm text-[var(--nf-content-secondary)]">{demandCounts(row, copy)}</p>
            </li>
          ))}
        </ul>
      )}
      {listHref && Array.isArray(rows) && rows.length > 0 && (
        <ButtonLink href={listHref} variant="secondary" className="mt-group">
          {copy.listCta}
        </ButtonLink>
      )}
    </section>
  );
}
