import { getDictionary, plural, type Locale } from "@vallo/i18n";
import { bpsAsPercentText } from "@/lib/money/percent";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DocActions, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { PrintDocumentTile } from "@/components/app/money/PrintDocumentTile";
import { formatMoneyDate } from "@/lib/money/dates";
import { PLATFORM_TERMS_V1, cancelStanding } from "@/lib/trust/cancellation";

/**
 * What is being bought, on the checkout screen.
 *
 * The stay's name and place, the dates, the party, every receipt line to the
 * kobo, and the total those lines add up to. It is its own component so the
 * route and the preview harness draw the same card: every figure is the
 * booking's own stored total in integer kobo, printed through `Amount`, and
 * the guest and night counts pick their form through `Intl.PluralRules`.
 */
export function CheckoutSummary({
  view,
  locale,
  tenancy = false,
}: {
  view: CheckoutView;
  locale: Locale;
  /** True when this booking row carries a rent charge: no stay terms apply to it. */
  tenancy?: boolean;
}) {
  const t = getDictionary(locale);
  const { counts, checkout: c } = t;
  /* V-20. What cancelling costs, said under the total at a size somebody
     reads before they pay, not in the grey type under a heading. A catalogue
     booking is priced under the platform schedule; the terms are frozen onto
     it at payment. */
  const cancelCopy = t.afterTheGate.cancel;
  // A server component rendered per request (the route is dynamic), so the
  // instant it renders is the instant the guest reads the line.
  const renderedAt = new Date();
  const standing = cancelStanding(PLATFORM_TERMS_V1, view.checkIn, renderedAt);
  const cancelLine = tenancy
    ? null
    : standing.kind === "free"
      ? cancelCopy.freeUntil.replace("{date}", formatMoneyDate(standing.until, locale, { withTime: true }) ?? "")
      : standing.kind === "share"
        ? cancelCopy.shareNow.replace("{percent}", bpsAsPercentText(standing.refundBps))
        : cancelCopy.nonRefundable;
  /*
   * TWO CONTAINERS, ONE CONTENT, AND THE MONEY DECIDES WHICH.
   *
   * Before payment this is the screen's hero: the Island tier (north star
   * section 4, reference 7038), the one per screen, holding what is being
   * bought and the total before the action that incurs it.
   *
   * Once a payment has settled against this booking (`view.paid`, which is a
   * SUCCESSFUL transaction row and nothing else) the same lines are a record
   * of money that moved, so they are drawn as a receipt on the document
   * sheet (D28.1) with a print action under it, and the total is called what
   * it now is: paid, not "to pay".
   */
  const paid = view.paid;
  const body = (
    <>
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
        <p className="nf-overline text-[var(--nf-content-muted)]">{paid ? t.afterTheGate.tenancy.totalPaid : c.totalToPay}</p>
        <p className="mt-2xs">
          <Amount
            minorUnits={view.totalMinor}
            locale={locale}
            currency={view.currency}
            showFraction
            suffix={paid ? undefined : c.inFull}
            className="text-[clamp(2.5rem,10vw,3.75rem)] font-extrabold leading-none tracking-[-0.03em] text-[var(--nf-content-primary)]"
            secondaryClassName="text-[0.34em] font-bold text-[var(--nf-content-muted)]"
          />
        </p>
        {cancelLine && (
          <p
            className="mt-xs text-[length:var(--nf-text-display-sm)] font-bold leading-tight tracking-[-0.02em] text-[var(--nf-content-primary)]"
            data-testid="checkout-cancel-line"
          >
            {cancelLine}
          </p>
        )}
        {view.platformTakesNothing && (
          <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
            {c.takesNothing}
          </p>
        )}
      </div>
    </>
  );

  if (paid) {
    return (
      <>
        <DocumentSheet kind="receipt" printable as="section" aria-labelledby="nf-checkout-summary" data-testid="checkout-receipt">
          {body}
        </DocumentSheet>
        <DocActions label={view.title}>
          <PrintDocumentTile label={t.afterTheGate.complaint.print} testId="checkout-receipt-print" />
        </DocActions>
      </>
    );
  }
  return (
    <section aria-labelledby="nf-checkout-summary" className="nf-island p-card" data-testid="checkout-summary">
      {body}
    </section>
  );
}
