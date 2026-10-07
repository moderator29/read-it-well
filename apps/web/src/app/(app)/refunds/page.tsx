import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { readMyPayments } from "@/lib/money/history";
import { parseBefore } from "@/lib/money/history-model";
import { refundEntries } from "@/lib/money/vault";
import {
  REFUNDS_EMPTY_BODY,
  REFUNDS_EMPTY_TITLE,
  REFUNDS_HOW_BODY,
  REFUNDS_HOW_TITLE,
  REFUNDS_LEDE,
  REFUNDS_SCOPE,
  REFUNDS_TITLE,
  REFUND_ROUTE,
} from "@/lib/money/copy";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/next-link";
import { HistoryList } from "@/components/app/money-history/HistoryList";
import { HistoryEmpty, HistoryUnavailable } from "@/components/app/money-history/HistoryStates";

export const metadata: Metadata = { title: "Refunds", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /refunds: THE MEMBER'S REFUNDS (R3-05).
 *
 * Every refund on a payment the member made, in every state, each with its
 * state as a word ("Processing", "Refunded", never the processor's code),
 * from the member's own payment history. A refund is asked for from its
 * booking, which is where the cancellation terms and the request live; this
 * screen says so rather than offering a second door to the same request. A
 * refunds-only read across every page is part of C2 REQUEST 6.
 */
export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const before = parseBefore((await searchParams).before);
  const read = await readMyPayments(before);

  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={REFUNDS_TITLE} fallback="/payments" />
      {read.state === "signed-out" ? (
        <EmptyState
          icon="receipt-check"
          title="Sign in to see your refunds"
          body={REFUNDS_LEDE}
          action={
            <ButtonLink href={withNext("/sign-in", "/refunds")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      ) : read.state === "error" ? (
        <div className="mt-block">
          <HistoryUnavailable retryHref="/refunds" />
        </div>
      ) : (
        <div className="mt-inline space-y-block">
          <p className={TYPE.body}>{REFUNDS_LEDE}</p>
          {(() => {
            const refunds = refundEntries(read.entries);
            if (refunds.length === 0 && !read.nextBefore && !before) {
              return <HistoryEmpty title={REFUNDS_EMPTY_TITLE} body={REFUNDS_EMPTY_BODY} next={{ href: "/bookings", label: "See your bookings" }} />;
            }
            return (
              <>
                <p className={TYPE.rowMeta}>{REFUNDS_SCOPE}</p>
                <HistoryList
                  entries={refunds}
                  nextBefore={read.nextBefore}
                  basePath="/refunds"
                  paged={before !== null}
                  locale={locale}
                  heading="Your refunds"
                  linkToBooking
                />
              </>
            );
          })()}
          <section className="nf-panel nf-panel--card" aria-labelledby="nf-refund-how">
            <h2 id="nf-refund-how" className="nf-body font-semibold text-[var(--nf-content-primary)]">
              {REFUNDS_HOW_TITLE}
            </h2>
            <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{REFUNDS_HOW_BODY}</p>
            <p className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">{REFUND_ROUTE}</p>
          </section>
        </div>
      )}
    </main>
  );
}
