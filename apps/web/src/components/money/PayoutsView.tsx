import type { Locale } from "@vallo/i18n/core";
import type { EarningsSummary, HistoryEntry } from "@/lib/money/history-model";
import {
  EARNINGS_SETTLEMENT,
  EARNINGS_TOTAL_LABEL,
  HISTORY_NOT_A_BALANCE,
  HOST_EARNINGS_EMPTY_BODY,
  PAYOUTS_EMPTY_TITLE,
  PAYOUTS_LEDE,
} from "@/lib/money/copy";
import { TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryEmpty } from "@/components/app/money-history/HistoryStates";
import { HistoryHero } from "@/components/app/money-history/HistoryHero";
import { PayoutList } from "./PayoutList";
import { MoneyCurve, type CurveRange } from "./MoneyCurve";

const CURVE_RANGES: CurveRange[] = [
  { key: "30", label: "30 days", days: 30, caption: "Your share in the last 30 days, after reversals" },
  { key: "90", label: "90 days", days: 90, caption: "Your share in the last 90 days, after reversals" },
  { key: "365", label: "12 months", days: 365, caption: "Your share in the last 12 months, after reversals" },
];

/**
 * /payouts once the read answered, as one component the route and the
 * preview harness (`/preview/p5/payouts`) both draw. Server-safe.
 */
export function PayoutsView({
  summary,
  entries,
  nextBefore,
  before,
  locale,
  now,
}: {
  summary: EarningsSummary;
  entries: HistoryEntry[];
  nextBefore: string | null;
  before: string | null;
  locale: Locale;
  /** The server's clock at render, for the ranges. */
  now: number;
}) {
  return (
    <div className="mt-inline space-y-block">
      <HistoryHero
        id="nf-payouts-total"
        label={EARNINGS_TOTAL_LABEL}
        totalMinor={summary.netMinor}
        locale={locale}
        note={`${EARNINGS_SETTLEMENT} ${HISTORY_NOT_A_BALANCE}`}
        facts={[]}
      />
      {/* Reference 5, only when this page is the whole record: what reached
          the bank over a range, from the rows themselves. A record that pages
          would make the range a part passed off as the whole. */}
      {nextBefore === null && before === null && entries.some((e) => e.kind === "earning") ? (
        <div className="nf-curve-card">
          <MoneyCurve
            events={entries.map((e) => ({ at: e.occurredAt, minor: e.kind === "reversal" ? -e.amountMinor : e.amountMinor }))}
            ranges={CURVE_RANGES}
            now={now}
            locale={locale}
            label="Range"
            testId="payouts-curve"
          />
        </div>
      ) : null}
      <p className={TYPE.body}>{PAYOUTS_LEDE}</p>
      {entries.length === 0 && !before ? (
        <HistoryEmpty icon="bank-column" title={PAYOUTS_EMPTY_TITLE} body={HOST_EARNINGS_EMPTY_BODY} next={{ href: "/settings/payments", label: "Check your payout details" }} />
      ) : (
        <PayoutList entries={entries} locale={locale} />
      )}
      {nextBefore ? (
        <ButtonLink href={`/payouts?before=${encodeURIComponent(nextBefore)}`} variant="secondary" size="md">
          Show earlier
        </ButtonLink>
      ) : null}
    </div>
  );
}
