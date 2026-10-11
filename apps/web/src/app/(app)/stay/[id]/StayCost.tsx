import { Amount } from "@/components/ui/Amount";
import type { Locale } from "@vallo/i18n/core";
import "./stay-detail.css";

/**
 * WHAT THIS STAY COSTS, laid out as the founder's reference 8 (the bill
 * breakdown) and the Property side's True Cost: a strip of three figures with
 * tiny uppercase labels, the third in the accent; then one card of line items,
 * each a label with a muted sub-line that shows the arithmetic, the amount
 * right aligned and tabular; then the total in a heavier weight.
 *
 * Only what the guest pays is drawn: the rate Book now opens, times the
 * nights. D51 gives the guest the advertised price with no fee line and no
 * footnote about fees, so there is no fee row here and no "nothing added"
 * sentence either. Which rate was picked, and why, is the line's own note,
 * in the policy's words (`afterTheGate.cancel`), so the page no longer
 * carries a second "Cancelling this stay" section beside "Cancellation".
 *
 * Drawn only when dates are picked and a rate can be booked for them; the
 * caller decides, and passes nothing it would have to invent.
 */
export function StayCost({
  locale,
  strip,
  line,
  total,
  notes,
}: {
  locale: Locale;
  /** CHECK IN, CHECK OUT and TOTAL: each a tiny label and a value. */
  strip: { checkIn: { label: string; value: string }; checkOut: { label: string; value: string }; totalLabel: string };
  line: { label: string; sub: string; minor: number };
  total: { label: string; minor: number };
  notes: readonly string[];
}) {
  return (
    <section className="nf-staycost" data-testid="stay-cost" aria-label={total.label}>
      <dl className="nf-staycost__strip">
        <div className="nf-staycost__cell">
          <dt>{strip.checkIn.label}</dt>
          <dd>{strip.checkIn.value}</dd>
        </div>
        <div className="nf-staycost__cell">
          <dt>{strip.checkOut.label}</dt>
          <dd>{strip.checkOut.value}</dd>
        </div>
        <div className="nf-staycost__cell nf-staycost__cell--accent">
          <dt>{strip.totalLabel}</dt>
          <dd className="nf-numeric">
            <Amount minorUnits={total.minor} locale={locale} secondaryClassName="nf-staycost__kobo" />
          </dd>
        </div>
      </dl>

      <div className="nf-staycost__card">
        <div className="nf-staycost__line">
          <span className="min-w-0">
            <span className="nf-staycost__label">{line.label}</span>
            <span className="nf-staycost__sub nf-numeric">{line.sub}</span>
          </span>
          <span className="nf-staycost__amount nf-numeric">
            <Amount minorUnits={line.minor} locale={locale} />
          </span>
        </div>
        <div className="nf-staycost__line nf-staycost__line--total">
          <span className="nf-staycost__label">{total.label}</span>
          <span className="nf-staycost__amount nf-numeric" data-testid="stay-cost-total">
            <Amount minorUnits={total.minor} locale={locale} secondaryClassName="nf-staycost__kobo" />
          </span>
        </div>
        {notes.length > 0 ? (
          <div className="nf-staycost__notes" data-testid="stay-book-now-choice">
            {notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
