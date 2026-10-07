import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { readMyBalance } from "@/lib/money/member-wallet";
import { BALANCE_LEDE, BALANCE_TITLE, HELD_BY, HELD_BY_HREF, HELD_BY_LINK, NOT_LIVE_BODY, NOT_LIVE_TITLE } from "@/lib/money/balance-copy";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { State } from "@/components/ui/State";
import { withNext } from "@/lib/auth/next-link";
import { BalanceScreen } from "@/components/money/balance/BalanceScreen";
import { BalanceOnboarding } from "@/components/money/balance/BalanceOnboarding";

export const metadata: Metadata = { title: "Balance", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * /wallet: THE MEMBER BALANCE (Part B phases 6 to 10; founder sections 36 to
 * 46; ADR 0003). The address keeps the word the founder and the provider use;
 * the page says Balance, because what a member sees is money our escrow
 * partner holds for them, read from the partner with its time.
 *
 * Five honest states and no sixth: signed out; the rail not open (no figure
 * at all, because any figure would be invented); opening the balance; the
 * read failed; and the balance itself. Design references: 6AF37222 (balance,
 * actions, activity) and 95840448 (send, one question at a time).
 */
export default async function BalancePage() {
  const locale = await getLocale();
  const read = await readMyBalance();

  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={BALANCE_TITLE} fallback="/home" />
      {read.state === "signed-out" ? (
        <EmptyState
          icon="bank-column"
          title="Sign in to see your balance"
          body={BALANCE_LEDE}
          action={
            <ButtonLink href={withNext("/sign-in", "/wallet")} variant="primary" size="lg">
              Sign in
            </ButtonLink>
          }
        />
      ) : read.state === "not-live" ? (
        <div className="mt-inline space-y-block" data-testid="balance-not-live" data-reason={read.reason}>
          <p className={TYPE.body}>{BALANCE_LEDE}</p>
          <State
            kind="empty"
            title={NOT_LIVE_TITLE}
            body={NOT_LIVE_BODY}
            primary={{ href: "/payments", label: "See your payments" }}
            secondary={{ href: "/receipts", label: "Your receipts" }}
          />
          <p className="nf-caption text-[var(--nf-content-muted)]">
            {HELD_BY}{" "}
            <Link href={HELD_BY_HREF} className="underline">
              {HELD_BY_LINK}
            </Link>
          </p>
        </div>
      ) : read.state === "onboarding" ? (
        <BalanceOnboarding state={read.onboarding} gaps={read.gaps} />
      ) : read.state === "error" ? (
        <div className="mt-block">
          <State
            kind="error"
            title="Your balance could not be read"
            body="Nothing has moved. We show no figure rather than a wrong one. Try again in a moment."
            primary={{ href: "/wallet", label: "Try again" }}
          />
        </div>
      ) : (
        <BalanceScreen figures={read.figures} movements={read.movements} live={read.live} locale={locale} now={Date.parse(read.readAt)} />
      )}
    </main>
  );
}
