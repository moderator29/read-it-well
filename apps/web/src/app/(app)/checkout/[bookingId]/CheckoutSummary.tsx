import { getDictionary, plural, type Locale } from "@vallo/i18n";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";

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
  const counts = getDictionary(locale).counts;
  return (
    <section aria-labelledby="nf-checkout-summary" className="nf-card p-md sm:p-lg">
      <h2 id="nf-checkout-summary" className="nf-h3">
        {view.title}
      </h2>
      {view.location.length > 0 && (
        <p className="mt-2xs flex items-center gap-2xs text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">
          <UiIcon name="location" size={12} className="shrink-0" />
          <span className="truncate">{view.location}</span>
        </p>
      )}

      <dl className="mt-md grid gap-xs border-t border-[var(--nf-divider)] pt-md">
        <div className="flex items-start justify-between gap-md">
          <dt className="text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">Dates</dt>
          <dd className="text-right text-[var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
            {view.dateRange}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-md">
          <dt className="text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">Guests</dt>
          <dd className="text-right text-[var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
            {plural(view.guests, counts.guests, locale)} &middot; {plural(view.nights, counts.nights, locale)}
          </dd>
        </div>
        {view.lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-md">
            <dt className="text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]">{line.label}</dt>
            <dd className="text-right text-[var(--nf-text-caption)] font-medium text-[var(--nf-content-secondary)]">
              {/* A receipt line, so the kobo is stated rather than rounded
                  away: this column has to add up to the total below it. */}
              <Amount minorUnits={line.minor} locale={locale} currency={view.currency} showFraction />
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-md border-t border-[var(--nf-divider)] pt-md">
        <p className="nf-overline text-[var(--nf-content-muted)]">Total to pay</p>
        <p className="mt-2xs">
          <Amount
            minorUnits={view.totalMinor}
            locale={locale}
            currency={view.currency}
            showFraction
            suffix="in full"
            className="text-[clamp(2.5rem,10vw,3.75rem)] font-extrabold leading-none tracking-[-0.03em] text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.34em] font-bold text-[var(--nf-content-muted)]"
          />
        </p>
        {view.platformTakesNothing && (
          <p className="mt-xs text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
            Vallo adds nothing of its own to this total. Every naira goes to the stay.
          </p>
        )}
      </div>
    </section>
  );
}
