import type { Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import {
  PAYOUTS_SAME_FIGURES,
  PAYOUT_FEE_LABEL,
  PAYOUT_FEE_UNRECORDED,
  PAYOUT_PAID_LABEL,
  PAYOUT_PROCESSING_LABEL,
  PAYOUT_RECEIVED_LABEL,
  PAYOUT_REVERSED_LABEL,
} from "@/lib/money/copy";
import { formatMoneyDate } from "@/lib/money/dates";
import { KIND_LABEL, type HistoryEntry } from "@/lib/money/history-model";
import { payoutFigures } from "@/lib/money/vault";
import "@/app/css/money-layer.css";

/**
 * PAYOUTS FOR HOSTS AND OWNERS, WITH THE SAME FIGURES AS AT PUBLISH (D51 rule 4).
 *
 * One card per payment: what the renter or guest paid, the platform fee in
 * naira, the processor's own fee where the record leaves one, and what
 * reached the bank, which is the subject and the only figure in full ink. A
 * figure the record does not carry says so; nothing is back-computed into a
 * fee. A reversal is its own card, said as one. Server-safe.
 */
export function PayoutList({ entries, locale }: { entries: readonly HistoryEntry[]; locale: Locale }) {
  return (
    <div className="grid gap-sm" data-testid="payout-list">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{PAYOUTS_SAME_FIGURES}</p>
      <ol className="grid gap-sm">
        {entries.map((entry) => {
          const day = formatMoneyDate(entry.occurredAt, locale, { withTime: true });
          if (entry.kind === "reversal") {
            return (
              <li key={entry.id} className="nf-panel nf-panel--card" data-testid="payout-reversal">
                <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{entry.title ?? KIND_LABEL.reversal}</p>
                {day ? <p className="nf-caption text-[var(--nf-content-muted)]">{day}</p> : null}
                <dl className="nf-maths mt-row">
                  <div className="nf-maths__row nf-maths__row--total">
                    <dt>{PAYOUT_REVERSED_LABEL}</dt>
                    <dd>
                      <Amount minorUnits={entry.amountMinor} locale={locale} showFraction />
                    </dd>
                  </div>
                </dl>
              </li>
            );
          }
          const f = payoutFigures(entry);
          return (
            <li key={entry.id} className="nf-panel nf-panel--card" data-testid="payout-row">
              <p className="nf-body font-semibold text-[var(--nf-content-primary)]">{entry.title ?? KIND_LABEL.earning}</p>
              {day ? <p className="nf-caption text-[var(--nf-content-muted)]">{day}</p> : null}
              <dl className="nf-maths mt-row">
                <div className="nf-maths__row">
                  <dt>{PAYOUT_PAID_LABEL}</dt>
                  <dd>{f.paidMinor === null ? PAYOUT_FEE_UNRECORDED : <Amount minorUnits={f.paidMinor} locale={locale} showFraction />}</dd>
                </div>
                <div className="nf-maths__row">
                  <dt>{PAYOUT_FEE_LABEL}</dt>
                  <dd data-testid="payout-fee">
                    {f.feeMinor === null ? PAYOUT_FEE_UNRECORDED : <Amount minorUnits={f.feeMinor} locale={locale} showFraction />}
                  </dd>
                </div>
                {f.processingMinor !== null ? (
                  <div className="nf-maths__row">
                    <dt>{PAYOUT_PROCESSING_LABEL}</dt>
                    <dd>
                      <Amount minorUnits={f.processingMinor} locale={locale} showFraction />
                    </dd>
                  </div>
                ) : null}
                <div className="nf-maths__row nf-maths__row--total">
                  <dt>{PAYOUT_RECEIVED_LABEL}</dt>
                  <dd data-testid="payout-received">
                    <Amount minorUnits={f.receivedMinor} locale={locale} showFraction />
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
