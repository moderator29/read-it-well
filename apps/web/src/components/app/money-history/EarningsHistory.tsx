import type { Locale } from "@vallo/i18n/core";
import type { EarningsSummary } from "@/lib/money/history-model";
import type { HistoryRead } from "@/lib/money/history";
import {
  EARNINGS_EMPTY_BODY,
  EARNINGS_EMPTY_TITLE,
  EARNINGS_GROSS_LABEL,
  EARNINGS_REVERSED_LABEL,
  EARNINGS_SETTLEMENT,
  EARNINGS_TOTAL_LABEL,
  HISTORY_NOT_A_BALANCE,
} from "@/lib/money/copy";
import { HistoryHero, type HistoryFact } from "./HistoryHero";
import { HistoryList } from "./HistoryList";
import { HistoryEmpty, HistoryUnavailable } from "./HistoryStates";
import type { StateAction } from "@/components/ui/State";

/**
 * A lister's earnings history: the share Paystack's split paid them, and any
 * refund that reversed part of it. Shared by the agent workspace
 * (`/agent/earnings`, under the monthly ledger it already had) and the host
 * workspace (`/host/earnings`), because the money moved the same way for both.
 *
 * The total is the lister's share AFTER reversals, which is the number that
 * actually reached their bank; what renters paid and what refunds reversed
 * sit beside it as named, positive figures. The sentence under it says where
 * the money went and when (`EARNINGS_SETTLEMENT`), and that Vallo never held
 * it, because an earnings figure on a platform is exactly where somebody
 * expects to find a "withdraw" button and there is none to find.
 *
 * `empty` lets the host say the one thing that is different for a host: that
 * payouts arrive by Paystack split to the bank account on their details.
 */
export function EarningsHistory({
  read,
  before,
  basePath,
  locale,
  emptyTitle = EARNINGS_EMPTY_TITLE,
  emptyBody = EARNINGS_EMPTY_BODY,
  next,
}: {
  read: Exclude<HistoryRead<EarningsSummary>, { state: "signed-out" }>;
  before: string | null;
  basePath: string;
  locale: Locale;
  emptyTitle?: string;
  emptyBody?: string;
  /** Where this lister's first payment would begin: their bookings or reservations. */
  next: StateAction;
}) {
  if (read.state === "error") return <HistoryUnavailable retryHref={basePath} />;
  const { summary } = read;
  const facts: HistoryFact[] = [];
  if (summary.grossMinor > 0) facts.push({ label: EARNINGS_GROSS_LABEL, minor: summary.grossMinor });
  if (summary.reversedMinor > 0) facts.push({ label: EARNINGS_REVERSED_LABEL, minor: summary.reversedMinor });

  return (
    <div className="nf-history space-y-block" data-testid="earnings-history">
      <HistoryHero
        id="nf-earnings-total"
        label={EARNINGS_TOTAL_LABEL}
        totalMinor={summary.netMinor}
        locale={locale}
        note={`${EARNINGS_SETTLEMENT} ${HISTORY_NOT_A_BALANCE}`}
        facts={facts}
      />
      {read.entries.length === 0 && !before ? (
        <HistoryEmpty icon="bank-column" title={emptyTitle} body={emptyBody} next={next} />
      ) : (
        <HistoryList
          entries={read.entries}
          nextBefore={read.nextBefore}
          basePath={basePath}
          paged={before !== null}
          locale={locale}
          heading="Your earnings and reversals"
        />
      )}
    </div>
  );
}
