import { getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import { readFrozenTerms, readMyRefundLines, type RefundLine } from "@/lib/after-gate/refunds";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { TYPE } from "@/components/app/Screen";
import { DocFigure, DocHead, DocRows, DocState, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { documentRowClass } from "@/components/app/money/document-sheet";
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
 * THE REFUND IS A DOCUMENT (D28.1, Session 3 W13). It is the paper a guest
 * screenshots to show a bank that money is coming back, so it is drawn on
 * the document sheet (`DocumentSheet`, the one definition for receipts,
 * statements and terms), light paper on whatever theme the member chose,
 * with the page around it unchanged. One refund leads with its amount as the
 * sheet's figure; several list their amounts on their rows. The figure never
 * counts or rolls: a refund that is decided is stated, not animated.
 *
 * Colour is never the only signal: every refund line carries its sentence
 * ("Refunded to your card Tue 13 Oct") and a shape (the filled circle for
 * money that went back, the hollow one for a refund still on its way or
 * still being decided, nothing for a line that is not a refund at all), and
 * the sentence stays in the paper's ink in every tone (a night-theme state
 * hue on white paper would fail contrast). Dates are the facts; there is no
 * tick.
 */
function lineMark(tone: RefundLine["tone"]): "done" | "waiting" | null {
  if (tone === "success") return "done";
  if (tone === "neutral") return null;
  return "waiting";
}

export async function BookingMoneyRecord({
  bookingId,
  checkIn,
  checkOut,
  cancelled,
  totalMinor,
  locale,
}: {
  bookingId: string;
  checkIn: string;
  checkOut: string;
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
    readMyRefundLines(bookingId, locale, { cancelled, checkOut }),
  ]);

  const record = getDictionary(locale).experienceSpeed.afterGate;
  /* One refund with an amount leads the sheet with it; several do not, so
     no line is promoted over another and nothing is summed on the page. */
  const withAmount = refunds.state === "ready" ? refunds.lines.filter((line) => line.amount) : [];
  const lead = refunds.state === "ready" && refunds.lines.length === 1 && withAmount.length === 1 ? withAmount[0] : null;
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
        <DocumentSheet aria-labelledby={`refund-${bookingId}`} data-testid="booking-refunds">
          <DocHead label={record.overline} title={copy.heading} id={`refund-${bookingId}`} />
          {lead?.amount && <DocFigure testId="booking-refund-figure">{lead.amount}</DocFigure>}
          <DocRows>
            {refunds.lines.map((line) => {
              const mark = lineMark(line.tone);
              const title = lead ? record.where : (line.amount ?? record.where);
              return (
                <div key={line.id} className={documentRowClass("prose")} data-testid="booking-refund-line" data-tone={line.tone}>
                  <dt>{mark ? <DocState done={mark === "done"}>{title}</DocState> : title}</dt>
                  <dd className="nf-numeric">
                    {line.sentence}
                    {line.retained && <span className="mt-3xs block text-[var(--nf-content-muted)]">{line.retained}</span>}
                  </dd>
                </div>
              );
            })}
          </DocRows>
        </DocumentSheet>
      )}
      {canAsk && (
        <RefundRequestForm
          success={getDictionary(locale).success}
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
