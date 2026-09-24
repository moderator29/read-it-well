import { getDictionary, plural, type Locale } from "@vallo/i18n";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Panel } from "@/components/ui/Panel";

/**
 * What is being bought, on the checkout screen.
 *
 * The stay's name and place, the dates, the party, every receipt line to the
 * kobo, and the total those lines add up to. It is its own component so the
 * route and the preview harness draw the same card: every figure is the
 * booking's own stored total in integer kobo, printed through `Amount`, and
 * the guest and night counts pick their form through `Intl.PluralRules`.
 */
export function CheckoutSummary({ view, locale }: { view: CheckoutView; locale: Locale }) {
  const { counts, checkout: c } = getDictionary(locale);
  return (
    <Panel aria-labelledby="nf-checkout-summary" variant="card">
      <h2 id="nf-checkout-summary" className="nf-h3">
        {view.title}
      </h2>
      {view.location.length > 0 && (
        <p className="mt-2xs flex items-center gap-2xs text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">
          <UiIcon name="location" size={12} className="shrink-0" />
          <span className="truncate">{view.location}</span>
        </p>
      )}

      <dl className="mt-md grid gap-xs border-t border-[var(--nf-panel-hair)] pt-md">
        <div className="flex items-start justify-between gap-md">
          <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{c.dates}</dt>
          <dd className="text-right text-[length:var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
            {view.dateRange}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-md">
          <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{c.guests}</dt>
          <dd className="text-right text-[length:var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
            {plural(view.guests, counts.guests, locale)} &middot; {plural(view.nights, counts.nights, locale)}
          </dd>
        </div>
        {view.lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-md">
            <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{line.label}</dt>
            <dd className="text-right text-[length:var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
              {/* A receipt line, so the kobo is stated rather than rounded
                  away: this column has to add up to the total below it. */}
              <Amount minorUnits={line.minor} locale={locale} currency={view.currency} showFraction />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-md border-t border-[var(--nf-panel-hair)] pt-md">
        <p className="nf-overline text-[var(--nf-content-muted)]">{c.totalToPay}</p>
        <p className="mt-2xs">
          <Amount
            minorUnits={view.totalMinor}
            locale={locale}
            currency={view.currency}
            showFraction
            suffix={c.inFull}
            className="text-[clamp(2.5rem,10vw,3.75rem)] font-extrabold leading-none tracking-[-0.03em] text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.34em] font-bold text-[var(--nf-content-muted)]"
          />
        </p>
        {view.platformTakesNothing && (
          <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
            {c.takesNothing}
          </p>
        )}
      </div>
    </Panel>
  );
}
