import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { readMyEarnings } from "@/lib/money/history";
import { parseBefore } from "@/lib/money/history-model";
import {
  EARNINGS_SETTLEMENT,
  HOST_EARNINGS_EMPTY_BODY,
  PAYOUTS_EMPTY_TITLE,
  PAYOUTS_LEDE,
  PAYOUTS_TITLE,
} from "@/lib/money/copy";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { authHref } from "@/components/auth/auth-intent";
import { HistoryEmpty, HistoryUnavailable } from "@/components/app/money-history/HistoryStates";
import { HistoryHero } from "@/components/app/money-history/HistoryHero";
import { PayoutList } from "@/components/money/PayoutList";
import { EARNINGS_TOTAL_LABEL, HISTORY_NOT_A_BALANCE } from "@/lib/money/copy";

export const metadata: Metadata = { title: "Payouts", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /payouts: PAYOUTS FOR HOSTS AND OWNERS (R3-05), with the same figures as at
 * publish (D51 rule 4): what was paid, the platform fee in naira, and what
 * reached the bank, payment by payment.
 *
 * From the lister's own earnings history (`my_earnings_history`, under their
 * session), whose rows carry the gross, the commission and any legacy
 * Guarantee contribution as recorded at settlement. Nothing is withdrawn here,
 * because on the live rail nothing waits to be: each share settled to the bank
 * in the same transaction (`EARNINGS_SETTLEMENT`).
 */
export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const before = parseBefore((await searchParams).before);
  const read = await readMyEarnings(before);

  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={PAYOUTS_TITLE} fallback="/home" />
      {read.state === "signed-out" ? (
        <EmptyState
          icon="bank-column"
          title="Sign in to see your payouts"
          body={PAYOUTS_LEDE}
          action={
            <ButtonLink href={authHref("/payouts", "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      ) : read.state === "error" ? (
        <div className="mt-block">
          <HistoryUnavailable retryHref="/payouts" />
        </div>
      ) : (
        <div className="mt-inline space-y-block">
          <HistoryHero
            id="nf-payouts-total"
            label={EARNINGS_TOTAL_LABEL}
            totalMinor={read.summary.netMinor}
            locale={locale}
            note={`${EARNINGS_SETTLEMENT} ${HISTORY_NOT_A_BALANCE}`}
            facts={[]}
          />
          <p className={TYPE.body}>{PAYOUTS_LEDE}</p>
          {read.entries.length === 0 && !before ? (
            <HistoryEmpty icon="bank-column" title={PAYOUTS_EMPTY_TITLE} body={HOST_EARNINGS_EMPTY_BODY} next={{ href: "/settings/payments", label: "Check your payout details" }} />
          ) : (
            <PayoutList entries={read.entries} locale={locale} />
          )}
          {read.nextBefore ? (
            <ButtonLink href={`/payouts?before=${encodeURIComponent(read.nextBefore)}`} variant="secondary" size="md">
              Show earlier
            </ButtonLink>
          ) : null}
        </div>
      )}
    </main>
  );
}
