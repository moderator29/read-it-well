import { formatDate, formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import type { WithdrawalFeesRead } from "@/lib/admin/desk-reads/withdrawal-fees-read";
import type { WithdrawalBand } from "@/lib/admin/desk-reads/withdrawal-fees";
import { fill } from "../_components/copy";
import { Panel, PanelUnavailable } from "../_components/panels";
import { DocHead, DocRow, DocRows, DocSection, DocumentSheet } from "@/components/app/money/DocumentSheet";

/**
 * THE WITHDRAWAL FEE SCHEDULE, AS A RECORD, AND A QUOTE TOOL BESIDE IT.
 *
 * The bands are the money policy in force (`money_policy_versions` and
 * `money_policy_withdrawal_bands`); the quote is `withdrawal_fee_quote`, the
 * same function a member is quoted by, so an operator can confirm what a
 * given amount costs without reading the table. The form is a plain GET: the
 * amount lives in the URL (`?withdraw=250000`), so a reload or a shared link
 * keeps the question. A band the founder has not confirmed has no fee shown
 * and says so; the database gives no quote in it either.
 */
function bandRange(band: WithdrawalBand, locale: Locale, c: { bandRange: string; bandOpen: string }): string {
  const from = formatMoney(band.fromMinor, locale);
  return band.toMinor === null ? fill(c.bandOpen, { from }) : fill(c.bandRange, { from, to: formatMoney(band.toMinor, locale) });
}

export function WithdrawalFees({ read, locale }: { read: WithdrawalFeesRead; locale: Locale }) {
  const c = getDictionary(locale).adminCoverage.withdrawalFees;
  if (read.state === "forbidden") return null;
  if (read.state !== "ok") {
    return (
      <Panel title={c.title} id="withdrawal-fees">
        <PanelUnavailable what={c.title} locale={locale} />
      </Panel>
    );
  }
  const { schedule, quote } = read;
  const since = formatDate(new Date(schedule.effectiveFrom), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" });
  const statusWords = c.quoteStatus as Record<string, string | undefined>;
  const hasUnconfirmed = schedule.bands.some((band) => !band.confirmed);

  return (
    <section className="nf-admin-doc" aria-labelledby="withdrawal-fees-title" id="withdrawal-fees">
      <DocumentSheet aria-labelledby="withdrawal-fees-title" data-testid="withdrawal-fees">
        <DocHead label={schedule.policyVersion} title={c.title} id="withdrawal-fees-title" />
        <p className="nf-doc__note">{c.lede}</p>
        <DocRows>
          <DocRow label={c.policyLabel} numeric>
            {fill(c.policySince, { when: since })}
          </DocRow>
          <DocRow label={c.minimumLabel} numeric>
            {formatMoney(schedule.minimumMinor, locale)}
          </DocRow>
        </DocRows>
        <DocSection title={c.bandColumn}>
          <DocRows>
            {schedule.bands.map((band) => (
              <DocRow key={band.id} label={bandRange(band, locale, c)} numeric>
                {band.confirmed && band.flatFeeMinor !== null ? fill(c.flat, { amount: formatMoney(band.flatFeeMinor, locale) }) : c.noRate}
                <span className="block text-[length:var(--nf-text-overline)] font-normal text-[var(--nf-content-muted)]">
                  {band.confirmed ? c.confirmed : c.unconfirmed}
                </span>
              </DocRow>
            ))}
          </DocRows>
        </DocSection>
        {hasUnconfirmed && <p className="nf-doc__note">{c.unconfirmedNote}</p>}
      </DocumentSheet>

      <Panel title={c.quoteTitle} id="withdrawal-quote" className="mt-md">
        <p className="nf-body-sm max-w-[68ch] text-content-2">{c.quoteBody}</p>
        <form method="get" action="/admin/fees#withdrawal-quote" className="mt-row flex flex-wrap items-end gap-inline">
          <div>
            <label className="nf-label" htmlFor="withdraw-amount">
              {c.quoteLabel}
            </label>
            <input
              id="withdraw-amount"
              name="withdraw"
              className="nf-field"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={quote?.asked ?? ""}
            />
          </div>
          <button type="submit" className="nf-btn nf-btn--secondary">
            {c.quoteButton}
          </button>
        </form>
        {quote && (
          <div className="mt-row" role="status" data-testid="withdrawal-quote-answer">
            {quote.answer.status === "ok" && quote.minor !== null ? (
              <>
                <p className="nf-overline">{fill(c.quoteFee, { amount: formatMoney(quote.minor, locale) })}</p>
                <p className="nf-numeric nf-h3 mt-inline-tight">{formatMoney(quote.answer.feeMinor, locale)}</p>
                <p className="nf-caption">
                  {c.quoteReceive}: {formatMoney(quote.answer.amountMinor - quote.answer.feeMinor, locale)}
                </p>
              </>
            ) : (
              <p className="nf-body-sm font-semibold text-content">
                {fill(statusWords[quote.answer.status] ?? c.quoteStatus.unavailable, {
                  minimum: quote.answer.status === "below_minimum" ? formatMoney(quote.answer.minimumMinor, locale) : "",
                })}
              </p>
            )}
          </div>
        )}
      </Panel>
    </section>
  );
}
