import { getDictionary } from "@vallo/i18n";
import type { RentPayView } from "@/lib/rent/queries";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The move-in total at the top of `/rent/pay/[inspectionId]`: the listing,
 * the stated total and its parts. Lifted out of the page so the orphans
 * sweep's fixture harness draws the real panel; the page still reads the
 * charge and decides every other state.
 */
export function RentSummary({ view }: { view: RentPayView }) {
  const copy = getDictionary(view.locale).afterTheGate;
  const c = getDictionary(view.locale).checkout;
  return (
    <section aria-labelledby="nf-rent-summary" className="nf-panel nf-panel--card block p-md sm:p-lg">
      <h2 id="nf-rent-summary" className="nf-h3">
        {view.title}
      </h2>
      {view.location.length > 0 && (
        <p className="mt-2xs flex items-center gap-2xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
          <UiIcon name="location" size={12} className="shrink-0" />
          <span className="truncate">{view.location}</span>
        </p>
      )}

      <p className="nf-caption mt-block text-[var(--nf-content-muted)]">
        {view.totalStated ? c.rentTotalStated : c.rentTotalFromParts}
      </p>
      <p className="mt-inline-tight">
        <Amount
          minorUnits={view.totalMinor}
          locale={view.locale}
          currency={view.currency}
          showFraction
          className="text-[length:var(--nf-text-display-sm)] font-bold leading-none tracking-[-0.02em] text-[var(--nf-content-primary)]"
          secondaryClassName="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-muted)]"
        />
      </p>

      <dl className="mt-block grid gap-inline">
        {view.lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-group">
            <dt className="nf-body-sm text-[var(--nf-content-secondary)]">{line.label}</dt>
            <dd className="nf-body-sm font-semibold tabular-nums text-[var(--nf-content-primary)]">
              {line.display}
            </dd>
          </div>
        ))}
        {/* V-13. The part of the stated total nobody itemised, on its own
            line and in the attention colour, with the words beside it so the
            colour is never the only signal. */}
        {view.remainderMinor > 0 && (
          <div
            className="flex items-baseline justify-between gap-group"
            data-testid="rent-remainder"
          >
            <dt className="nf-body-sm text-[var(--nf-state-warning)]">
              {copy.remainder.line}
              <span className="nf-caption block text-[var(--nf-content-muted)]">{copy.remainder.note}</span>
            </dt>
            <dd className="nf-body-sm font-semibold tabular-nums text-[var(--nf-state-warning)]">
              {view.remainderDisplay}
            </dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-group border-t border-[var(--nf-line)] pt-inline">
          <dt className="nf-body font-semibold text-[var(--nf-content-primary)]">{c.totalToPay}</dt>
          <dd className="nf-body font-semibold tabular-nums text-[var(--nf-content-primary)]">
            {view.totalDisplay}
          </dd>
        </div>
      </dl>

      {/* V-13. Once the lister said yes, the figure is a quote with a date. */}
      <p
        className="nf-body-sm mt-block leading-relaxed text-[var(--nf-content-secondary)]"
        data-testid={view.quotedOnDisplay ? "rent-quote-frozen" : "rent-quote-open"}
      >
        {view.quotedOnDisplay
          ? copy.quote.frozen.replace("{amount}", view.totalDisplay).replace("{date}", view.quotedOnDisplay)
          : copy.quote.notYetFrozen}
      </p>

      <p className="nf-caption mt-inline leading-relaxed text-[var(--nf-content-muted)]">
        {c.rentTerms.replace("{period}", c.rentPeriod[view.rentPeriod]).replace("{moveIn}", view.moveInDisplay)}
      </p>
      {view.bookingId && view.holdExpiresAt && !view.holdExpired && (
        <p className="nf-caption mt-inline leading-relaxed text-[var(--nf-content-muted)]">
          {c.rentStepOpen}
        </p>
      )}
    </section>
  );
}
