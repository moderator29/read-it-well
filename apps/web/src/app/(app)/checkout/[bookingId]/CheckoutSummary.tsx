import { getDictionary, plural, type Locale } from "@vallo/i18n";
import { bpsAsPercentText } from "@/lib/money/percent";
import type { CheckoutView } from "@/lib/bookings/checkout-view";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DocActions } from "@/components/app/money/DocumentSheet";
import { ReceiptSheet } from "@/components/app/money/ReceiptSheet";
import { stayReceipt } from "@/components/app/money/receipt-model";
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
          <dd className="text-right text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]">
            {view.dateRange}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-md">
          <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{c.guests}</dt>
          <dd className="text-right text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]">
            {plural(view.guests, counts.guests, locale)} &middot; {plural(view.nights, counts.nights, locale)}
          </dd>
        </div>
        {view.lines.map((line) => (
          <div key={line.label} className="flex items-start justify-between gap-md">
            <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{line.label}</dt>
            <dd className="text-right text-[length:var(--nf-text-caption)] font-semibold text-[var(--nf-content-secondary)]">
              {/* A receipt line, so the kobo is stated rather than rounded
                  away: this column has to add up to the total below it. The kobo
                  keeps the line's own ink: Amount's default 60% fade on this
                  secondary ink measured 2.97:1 on paper (axe). */}
              <Amount
                minorUnits={line.minor}
                locale={locale}
                currency={view.currency}
                showFraction
                secondaryClassName="text-[length:max(0.75rem,0.62em)] font-semibold"
              />
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
            className="text-[clamp(2.5rem,10vw,3.75rem)] font-bold leading-none tracking-[-0.03em] text-[var(--nf-content-primary)]"
            secondaryClassName="text-[length:max(0.34em,0.75rem)] font-bold text-[var(--nf-content-muted)]"
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
        {/* No line about fees, not even "Vallo adds nothing": D51 gives the
            guest the advertised price and no footnote at all. */}
      </div>
    </>
  );

  /*
   * THE RECEIPT IS THE ONE RECEIPT MODEL (W9). Once paid, these lines are no
   * longer drawn here: `stayReceipt` turns the same view into finished words
   * and `ReceiptSheet` draws them, and the receipt email draws the very same
   * model, so the receipt on screen and the one in the inbox cannot differ.
   */
  const receipt = paid ? stayReceipt(view, t, locale) : null;
  if (receipt) {
    return (
      <ReceiptSheet
        receipt={receipt}
        headingId="nf-checkout-summary"
        testId="checkout-receipt"
        actions={
          <DocActions label={view.title}>
            <PrintDocumentTile label={t.afterTheGate.complaint.print} testId="checkout-receipt-print" />
          </DocActions>
        }
      />
    );
  }
  return (
    <section aria-labelledby="nf-checkout-summary" className="nf-island p-card" data-testid="checkout-summary">
      {body}
    </section>
  );
}
