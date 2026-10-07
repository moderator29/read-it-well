import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { readMyBalance } from "@/lib/money/member-wallet";
import { BALANCE_LEDE, BALANCE_TITLE } from "@/lib/money/balance-copy";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { withNext } from "@/lib/auth/next-link";
import { BalanceView } from "@/components/money/balance/BalanceView";

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
 * read failed; and the balance itself. The four signed-in states are
 * `BalanceView`, which the preview harness draws too (`/preview/p5/wallet`).
 * Design references: 6AF37222 (balance, actions, activity), 95840448 (send,
 * one question at a time), IMG_7027 (amount entry), PREMIUM-STANDARD 4, 7, 9.
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
      ) : (
        <BalanceView read={read} locale={locale} />
      )}
    </main>
  );
}
