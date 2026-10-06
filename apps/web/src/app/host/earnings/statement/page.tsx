import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { lagosToday, parseMonth } from "@/lib/host/rate-calendar";
import { readMonthEarnings } from "@/lib/host/statement-read";
import { statementLines } from "@/lib/host/statement";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { HostShell } from "@/components/host/HostShell";
import { StatementView } from "@/components/host/StatementView";
import { HostInnerNav } from "@/components/host/HostInnerNav";
import { hostInnerNavCopy } from "@/components/host/host-inner-nav";

export const metadata: Metadata = { title: "Payout statement", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * /host/earnings/statement?month=YYYY-MM: EVERY LINE OF EVERY PAYMENT IN A
 * MONTH (C9, 30 September 2026). READ ONLY.
 *
 * For each payment: what the guest paid, Vallo's commission, the Guarantee
 * contribution, the host's share and the Paystack reference, exactly as
 * `my_earnings_history` returns them; a refund's reversal as negatives. The
 * totals are sums. A CSV of the same lines, and a print stylesheet so the
 * page itself is the printable statement. Nothing here moves money, and the
 * words about where the money went are the platform's own
 * (`EARNINGS_SETTLEMENT`, `HISTORY_NOT_A_BALANCE`).
 */
export default async function HostStatementPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const raw = (await searchParams).month;
  const thisMonth = lagosToday().slice(0, 7);
  const asked = parseMonth(Array.isArray(raw) ? raw[0] : raw);
  const month = asked && asked <= thisMonth ? asked : thisMonth;
  const read = await readMonthEarnings(month);
  const tag = locale === "en" ? "en-NG" : locale;
  const title = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );

  if (read.state === "signed-out") {
    return (
      <HostShell fallback="/host/earnings">
        <EmptyState
          icon="ledger-book"
          title="Your payout statements"
          body="Sign in to see every payment, what Vallo kept, and what reached your bank."
          action={
            <ButtonLink href={authHref(returnHref("/host/earnings/statement", `?month=${month}`, "list"), "sign-in")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      </HostShell>
    );
  }

  return (
    <HostShell fallback="/host/earnings" wide>
      <HostInnerNav active="statements" {...hostInnerNavCopy(getDictionary(locale))} />
      <StatementView
        month={month}
        thisMonth={thisMonth}
        title={title}
        lines={read.state === "ok" ? statementLines(read.entries, month) : []}
        complete={read.state === "ok" ? read.complete : true}
        failed={read.state === "error"}
        locale={locale}
      />
    </HostShell>
  );
}
