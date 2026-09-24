import { getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import { readFrozenTerms, readMyRefundLines, type RefundLine } from "@/lib/after-gate/refunds";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { CANCELLATION_REASONS } from "@/lib/trust/cancellation";
import { RefundRequestForm } from "./RefundRequestForm";

/**
 * The money record under one stay: the terms it was paid under, and every
 * refund with its due-by date. V-20 and V-24.
 *
 * Renders NOTHING for a stay that was never paid and never refunded, which is
 * every stay today: an empty "Your refund" heading over nothing would be a
 * claim that something is owed. A read that failed says so in one line rather
 * than pretending there is nothing.
 *
 * Colour is never the only signal: every refund line carries its sentence
 * ("Due in your wallet by Thu 22 Oct", "In your wallet Tue 13 Oct, 10:02am")
 * and an icon, and the tone only reinforces it.
 */
const TONE_CLASS: Record<RefundLine["tone"], string> = {
  success: "text-[var(--nf-state-success)]",
  attention: "text-[var(--nf-state-warning)]",
  error: "text-[var(--nf-state-error)]",
  neutral: "text-[var(--nf-content-secondary)]",
};

const TONE_ICON: Record<RefundLine["tone"], "verified" | "history" | "info"> = {
  success: "verified",
  attention: "history",
  error: "info",
  neutral: "info",
};

export async function BookingMoneyRecord({
  bookingId,
  checkIn,
  cancelled,
  totalMinor,
  locale,
}: {
  bookingId: string;
  checkIn: string;
  /** The booking's own status says CANCELLED. */
  cancelled: boolean;
  /** What was paid, in kobo, when the caller has it; without it the terms show as shares. */
  totalMinor?: number | null;
  locale: Locale;
}) {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const copy = getDictionary(locale).afterTheGate.refund;
  const [frozen, refunds] = await Promise.all([
    readFrozenTerms(session.supabase, bookingId),
    readMyRefundLines(bookingId, locale, { cancelled }),
  ]);

  const canAsk = refunds.state !== "unavailable" && refunds.canAsk;
  if (!frozen && refunds.state === "none" && !canAsk) return null;

  return (
    <section className="mt-lg grid gap-lg" data-testid="booking-money-record">
      {refunds.state === "unavailable" && (
        <p className={TYPE.body} role="status">
          {copy.unavailable}
        </p>
      )}
      {refunds.state === "ready" && (
        <div className="nf-panel nf-panel--card block p-md" data-testid="booking-refunds">
          <h2 className="nf-h3">{copy.heading}</h2>
          <ul className="mt-row grid gap-row">
            {refunds.lines.map((line) => (
              <li key={line.id} className="grid gap-2xs" data-testid="booking-refund-line" data-tone={line.tone}>
                {line.amount && <p className={`${TYPE.rowTitle} nf-numeric`}>{line.amount}</p>}
                <p className={`flex items-start gap-xs ${TYPE.body} ${TONE_CLASS[line.tone]}`}>
                  <UiIcon name={TONE_ICON[line.tone]} size={16} className="mt-3xs shrink-0" />
                  <span className="nf-numeric">{line.sentence}</span>
                </p>
                {line.retained && <p className={TYPE.rowMeta}>{line.retained}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {canAsk && (
        <RefundRequestForm
          bookingId={bookingId}
          copy={copy}
          reasons={CANCELLATION_REASONS.map((reason) => ({ code: reason.code, label: copy.reasons[reason.code] }))}
        />
      )}
      {frozen && (
        <div className="nf-panel nf-panel--card block p-md">
          <CancellationTimeline
            checkIn={checkIn}
            totalMinor={totalMinor}
            locale={locale}
            headingLevel="h2"
            terms={frozen.terms}
            frozenAt={frozen.frozenAt}
          />
        </div>
      )}
    </section>
  );
}
