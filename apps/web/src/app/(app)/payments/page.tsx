import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { readMyPayments } from "@/lib/money/history";
import { parseBefore } from "@/lib/money/history-model";
import {
  HISTORY_NOT_A_BALANCE,
  PAYMENTS_EMPTY_BODY,
  PAYMENTS_EMPTY_TITLE,
  PAYMENTS_REFUNDED_LABEL,
  PAYMENTS_TOTAL_LABEL,
  REFUND_ROUTE,
} from "@/lib/money/copy";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { authHref } from "@/components/auth/auth-intent";
import { HistoryHero } from "@/components/app/money-history/HistoryHero";
import { HistoryList } from "@/components/app/money-history/HistoryList";
import { HistoryEmpty, HistoryUnavailable } from "@/components/app/money-history/HistoryStates";

export const metadata: Metadata = { title: "Payments", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /payments: what a renter or guest has paid through Vallo, and every refund
 * that came back to their card or bank account.
 *
 * A RECORD, NOT AN ACCOUNT. Vallo never holds anybody's money: when somebody
 * pays, Paystack splits the charge in the same transaction, the lister's share
 * to the lister's bank, the Guarantee contribution to its reserve. So there is
 * nothing on this screen to top up, spend or withdraw, and the figure at the
 * top is the sum of what was paid, said as that. Every row is read from
 * `my_payments_history` under the person's own session, at the moment of
 * asking (lib/money/history.ts).
 *
 * The total is lifetime and does not change as "Show earlier" pages back; the
 * list is fifty rows at a time, newest first, grouped by Lagos day.
 */
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const before = parseBefore(params.before);
  const read = await readMyPayments(before);

  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title="Payments" fallback="/home" />

      {read.state === "signed-out" ? (
        <EmptyState
          icon="receipt-check"
          title="Sign in to see your payments"
          body={HISTORY_NOT_A_BALANCE}
          action={
            <ButtonLink href={authHref("/payments", "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      ) : read.state === "error" ? (
        <div className="mt-block">
          <HistoryUnavailable retryHref="/payments" />
        </div>
      ) : (
        <div className="mt-inline space-y-block">
          <HistoryHero
            id="nf-payments-total"
            label={PAYMENTS_TOTAL_LABEL}
            totalMinor={read.summary.paidMinor}
            locale={locale}
            note={HISTORY_NOT_A_BALANCE}
            facts={
              read.summary.refundedMinor > 0
                ? [{ label: PAYMENTS_REFUNDED_LABEL, minor: read.summary.refundedMinor }]
                : []
            }
          />
          {read.entries.length === 0 && !before ? (
            <HistoryEmpty
              title={PAYMENTS_EMPTY_TITLE}
              body={PAYMENTS_EMPTY_BODY}
              next={{ href: "/agreements", label: "See your agreements" }}
            />
          ) : (
            <HistoryList
              entries={read.entries}
              nextBefore={read.nextBefore}
              basePath="/payments"
              paged={before !== null}
              locale={locale}
              heading="Your payments and refunds"
              /* Each row opens its booking, where the stay or tenancy and
                 its receipt live. A row with no booking stays a plain row. */
              linkToBooking
            />
          )}
          <p className={TYPE.rowMeta}>{REFUND_ROUTE}</p>
        </div>
      )}
    </main>
  );
}
