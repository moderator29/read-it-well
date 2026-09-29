import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { readMyEarnings } from "@/lib/money/history";
import { parseBefore } from "@/lib/money/history-model";
import { HOST_EARNINGS_EMPTY_BODY, PAYOUT_ANSWER } from "@/lib/money/copy";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { EarningsHistory } from "@/components/app/money-history/EarningsHistory";

export const metadata: Metadata = { title: "Earnings", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * /host/earnings: what guests' payments paid this host, payment by payment,
 * and any refund that reversed part of one.
 *
 * The same record the agent workspace shows (`my_earnings_history`, read under
 * the host's own session), in the host shell. Most hosts will open this before
 * their first guest has paid, so the empty state is the screen they meet
 * first, and it says the one thing a host needs to know about being paid on
 * Vallo: there is no payout to request. The moment a guest pays, Paystack
 * splits the charge and the host's share goes straight to the bank account
 * on their payout details.
 */
export default async function HostEarningsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const before = parseBefore((await searchParams).before);
  const read = await readMyEarnings(before);

  return (
    <HostShell logoLabel={t.a11y.logoHome} fallback="/host">
      <div className="mx-auto max-w-2xl">
        <h1 className="nf-h2">Earnings</h1>
        <p className={`mt-xs mb-block ${TYPE.body}`}>{PAYOUT_ANSWER}</p>
        {read.state === "signed-out" ? (
          <EmptyState
            icon="bank-column"
            title="Sign in to see your earnings"
            body={HOST_EARNINGS_EMPTY_BODY}
            action={
              <ButtonLink href={authHref(returnHref("/host/earnings", "", "list"), "sign-in")} variant="primary" size="lg">
                Sign in
              </ButtonLink>
            }
          />
        ) : (
          <EarningsHistory
            read={read}
            before={before}
            basePath="/host/earnings"
            locale={locale}
            emptyTitle="No guest has paid yet"
            emptyBody={HOST_EARNINGS_EMPTY_BODY}
            next={{ href: "/host/reservations", label: "See your reservations" }}
          />
        )}
      </div>
    </HostShell>
  );
}
