import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { BalanceCard } from "@/components/app/wallet/BalanceCard";
import { TransactionsSection } from "@/components/app/wallet/TransactionsSection";
import { SecurityNote } from "@/components/app/wallet/SecurityNote";
import { getWalletForViewer } from "@/lib/wallet/repository";
import { FundingVerifier } from "./FundingVerifier";
import { WalletDeck } from "./WalletDeck";

export const metadata: Metadata = { title: "Wallet" };

/**
 * Wallet.
 *
 * Balance hero, action deck, day-grouped history, trust strip. When Supabase
 * is configured and the viewer is signed in, every figure is their real
 * ledger: the balance derived by the wallet_balances view and the newest
 * entries under RLS, so the number on screen and the rows beneath it can
 * never disagree (Master Rules 8 and 50). Signed out or unconfigured, the
 * seed ledger stands in with the same integer-kobo arithmetic.
 *
 * Add money opens a hosted Paystack checkout; the return trip lands here as
 * ?funded=1&reference=rm-fund-..., where the verifier credits the ledger
 * idempotently in case the webhook has not arrived yet. Withdrawals and
 * transfers post through the wallet actions and re-read the statement.
 */
export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ funded?: string; reference?: string }>;
}) {
  const { funded, reference } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const wallet = await getWalletForViewer();

  const verifying =
    funded === "1" && typeof reference === "string" && reference.startsWith("rm-fund-")
      ? reference
      : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.wallet} />

      {verifying && <FundingVerifier reference={verifying} locale={locale} />}

      <Reveal>
        <BalanceCard
          balanceMinor={wallet.balanceMinor}
          entries={wallet.entries}
          locale={locale}
        />
      </Reveal>

      <Reveal delay={80} className="mt-4">
        <WalletDeck locale={locale} balanceMinor={wallet.balanceMinor} live={wallet.live} />
      </Reveal>

      <Reveal delay={140} className="mt-8">
        <TransactionsSection entries={wallet.entries} locale={locale} />
      </Reveal>

      <Reveal delay={200} className="mt-6">
        <SecurityNote />
      </Reveal>
    </div>
  );
}
