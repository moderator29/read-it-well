import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ButtonLink } from "@/components/ui/Button";
import { BalanceCard } from "@/components/app/wallet/BalanceCard";
import { TransactionsSection } from "@/components/app/wallet/TransactionsSection";
import { WalletSettingsSheet } from "@/components/app/wallet/WalletSettingsSheet";
import { getWalletForViewer } from "@/lib/wallet/repository";
import { FundingVerifier } from "./FundingVerifier";
import { WalletDeck } from "./WalletDeck";

export const metadata: Metadata = { title: "Wallet" };

/**
 * Wallet.
 *
 * Balance hero, action deck, day-grouped history, trust strip. Every figure is
 * the viewer's real ledger: the balance derived by the wallet_balances view
 * and the newest entries under RLS, so the number on screen and the rows
 * beneath it can never disagree (Master Rules 8 and 50).
 *
 * **Signed out, there is no balance on this page at all.** It used to stand in
 * a seeded ledger holding ₦258,450.75 with a full statement under it, and the
 * flag that marked it invented never reached the card that drew the figure.
 * Every bank, and Stripe, Wise and Cash App with them, answers a signed-out
 * request for a balance with a sign-in wall rather than a specimen, because a
 * number beside a currency symbol is read as a fact about the reader before
 * any caption is.
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

  /*
   * The naira-per-dollar rate, from configuration only.
   *
   * There is no fallback and no constant in the code. A hard-coded FX figure
   * would put an invented number where a user reads their own balance, and a
   * stale one is worse than none - so with nothing configured the currency
   * toggle simply does not appear. Set NEXT_PUBLIC_NGN_USD_RATE to switch it on,
   * or replace this with a real rate feed when one exists.
   */
  const parsedRate = Number(process.env.NEXT_PUBLIC_NGN_USD_RATE);
  const usdRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="/brand/story-wallet.png" />
        {/*
          Settings live at the TOP of the wallet, beside its title, which is
          where a user looks for them. The trust strip that used to sit at the
          very bottom of this page - below the entire transaction history - now
          lives inside that sheet along with everything else about how the
          wallet behaves.
        */}
        <div className="flex items-start justify-between gap-4">
          <PageHeader title={t.nav.wallet} />
          <div className="mt-1 shrink-0">
            <WalletSettingsSheet />
          </div>
        </div>
      </div>

      {verifying && <FundingVerifier reference={verifying} locale={locale} />}

      {!wallet.live ? (
        <Reveal>
          <div className="nf-card p-6 text-center sm:p-8">
            <span className="nf-story-art mx-auto block h-16 w-16">
              <BrandIcon name="wallet-secure" fill />
            </span>
            <h2 className="nf-h3 mt-4">Your wallet is behind your sign in</h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Sign in to see your balance, add money, send it on and read every
              payment in and out. Nothing about your money is shown to anybody
              who is not signed in as you.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <ButtonLink href="/sign-in" variant="primary">
                Sign in
              </ButtonLink>
              <ButtonLink href="/search" variant="secondary">
                Explore places
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      ) : (
        <>
      <Reveal>
        <BalanceCard
          balanceMinor={wallet.balanceMinor}
          entries={wallet.entries}
          locale={locale}
          usdRate={usdRate}
        />
      </Reveal>

      <Reveal delay={80} className="mt-4">
        <WalletDeck locale={locale} balanceMinor={wallet.balanceMinor} live={wallet.live} />
      </Reveal>

      <Reveal delay={140} className="mt-8">
        <TransactionsSection entries={wallet.entries} locale={locale} />
      </Reveal>
        </>
      )}
    </div>
  );
}
