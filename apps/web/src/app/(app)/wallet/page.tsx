import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { BalanceCard } from "@/components/app/wallet/BalanceCard";
import { WalletActions } from "@/components/app/wallet/WalletActions";
import { TransactionsSection } from "@/components/app/wallet/TransactionsSection";
import { SecurityNote } from "@/components/app/wallet/SecurityNote";
import { getWalletRepository } from "@/lib/wallet/repository";

export const metadata: Metadata = { title: "Wallet" };

/**
 * Wallet.
 *
 * Balance hero, action row, then history. The balance and every entry come
 * from the wallet repository, which derives money from the ledger and never
 * invents a figure: a fresh account shows ₦0.00 and an empty history, which is
 * the truth (Master Rules 8 and 50). Add money, Withdraw and Transfer validate
 * for real on the server and say honestly that money moves once the payment
 * environment is connected.
 */
export default async function WalletPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const wallet = await getWalletRepository().getWallet();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.wallet} />

      <Reveal>
        <BalanceCard balanceMinor={wallet.balanceMinor} locale={locale} />
      </Reveal>

      <Reveal delay={80} className="mt-4">
        <WalletActions locale={locale} />
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
