import type { RentPayView } from "@/lib/rent/queries";
import { RENT_PERIOD_LABEL } from "@/lib/listings/pricing";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The move-in total at the top of `/rent/pay/[inspectionId]`: the listing,
 * the stated total and its parts. Lifted out of the page so the orphans
 * sweep's fixture harness draws the real panel; the page still reads the
 * charge and decides every other state.
 */
export function RentSummary({ view }: { view: RentPayView }) {
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
        {view.totalStated
          ? "Move-in total, as stated by the lister"
          : "Move-in total, from the parts the lister stated"}
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
        <div className="flex items-baseline justify-between gap-group border-t border-[var(--nf-line)] pt-inline">
          <dt className="nf-body font-semibold text-[var(--nf-content-primary)]">Total to pay</dt>
          <dd className="nf-body font-semibold tabular-nums text-[var(--nf-content-primary)]">
            {view.totalDisplay}
          </dd>
        </div>
      </dl>

      <p className="nf-caption mt-block leading-relaxed text-[var(--nf-content-muted)]">
        Rent is {RENT_PERIOD_LABEL[view.rentPeriod].toLowerCase()}, moving in from {view.moveIn}.
        Vallo charges nothing on this payment; a card processor may show its own charge on the
        payment page.
      </p>
      {view.bookingId && view.holdExpiresAt && !view.holdExpired && (
        <p className="nf-caption mt-inline leading-relaxed text-[var(--nf-content-muted)]">
          This payment step stays open for 48 hours from when you opened it. If it closes unpaid,
          open it again from here.
        </p>
      )}
    </section>
  );
}
