import type { Locale } from "@vallo/i18n/core";
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
import { KIND_LABEL, statusFor, type HistoryEntry } from "@/lib/money/history-model";
import { payoutFigures } from "@/lib/money/vault";
import { MoneyFigure, StatusWord } from "./kit";
import "@/app/css/money-layer.css";

/**
 * PAYOUTS FOR HOSTS AND OWNERS, WITH THE SAME FIGURES AS AT PUBLISH (D51 rule 4).
 *
 * One bill per payment (PREMIUM-STANDARD reference 8): the space and the day
 * with its status word, then the line items: what the renter or guest paid,
 * the platform fee in naira, the processor's own fee where the record leaves
 * one, and what reached the bank, the subject, lit and in the heavier
 * weight. A figure the record does not carry says so; nothing is
 * back-computed into a fee. A reversal is its own card, said as one.
 * Server-safe.
 */
export function PayoutList({ entries, locale }: { entries: readonly HistoryEntry[]; locale: Locale }) {
  const money = (minor: number) => <MoneyFigure minor={minor} locale={locale} size="row" />;
  return (
    <div className="grid gap-sm" data-testid="payout-list">
      <p className="nf-body-sm text-[var(--nf-content-secondary)]">{PAYOUTS_SAME_FIGURES}</p>
      <ol className="grid gap-sm">
        {entries.map((entry) => {
          const day = formatMoneyDate(entry.occurredAt, locale, { withTime: true });
          const status = statusFor(entry.kind, entry.status);
          if (entry.kind === "reversal") {
            return (
              <li key={entry.id} className="nf-payout" data-testid="payout-reversal">
                <div className="nf-payout__head">
                  <div className="min-w-0">
                    <p className="nf-payout__title">{entry.title ?? KIND_LABEL.reversal}</p>
                    {day ? <p className="nf-payout__day">{day}</p> : null}
                  </div>
                  <StatusWord tone={status.tone}>{status.label}</StatusWord>
                </div>
                <dl className="nf-maths nf-maths--bill nf-maths--inset">
                  <div className="nf-maths__row nf-maths__row--total">
                    <dt>{PAYOUT_REVERSED_LABEL}</dt>
                    <dd>{money(entry.amountMinor)}</dd>
                  </div>
                </dl>
              </li>
            );
          }
          const f = payoutFigures(entry);
          return (
            <li key={entry.id} className="nf-payout" data-testid="payout-row">
              <div className="nf-payout__head">
                <div className="min-w-0">
                  <p className="nf-payout__title">{entry.title ?? KIND_LABEL.earning}</p>
                  {day ? <p className="nf-payout__day">{day}</p> : null}
                </div>
                <StatusWord tone={status.tone}>{status.label}</StatusWord>
              </div>
              <dl className="nf-maths nf-maths--bill nf-maths--inset">
                <div className="nf-maths__row">
                  <dt>{PAYOUT_PAID_LABEL}</dt>
                  <dd>{f.paidMinor === null ? PAYOUT_FEE_UNRECORDED : money(f.paidMinor)}</dd>
                </div>
                <div className="nf-maths__row">
                  <dt>{PAYOUT_FEE_LABEL}</dt>
                  <dd data-testid="payout-fee">{f.feeMinor === null ? PAYOUT_FEE_UNRECORDED : money(f.feeMinor)}</dd>
                </div>
                {f.processingMinor !== null ? (
                  <div className="nf-maths__row">
                    <dt>{PAYOUT_PROCESSING_LABEL}</dt>
                    <dd>{money(f.processingMinor)}</dd>
                  </div>
                ) : null}
                <div className="nf-maths__row nf-maths__row--total nf-maths__row--lit">
                  <dt>{PAYOUT_RECEIVED_LABEL}</dt>
                  <dd data-testid="payout-received">{money(f.receivedMinor)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
