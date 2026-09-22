import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Reveal } from "@/components/site/Reveal";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { TrustStrip } from "@/components/app/wallet/TrustStrip";
import { WalletSettingsSheet } from "@/components/app/wallet/WalletSettingsSheet";
import { getWalletForViewer } from "@/lib/wallet/repository";
import { isYellowCardConfigured } from "@/lib/payments/yellowcard";
import { listPaymentMethods } from "@/lib/payments/methods-actions";
import { readPots } from "@/lib/wallet/pots";
import { PotsSection } from "@/components/app/wallet/PotsSection";
import { FundingVerifier } from "./FundingVerifier";
import { WalletDeck } from "./WalletDeck";

export const metadata: Metadata = { title: "Wallet" };

/**
 * Wallet.
 *
 * The balance hero with its four tiles, the quick actions, the pots when
 * the migration is applied, the recent transactions card and the trust
 * strip. Every figure is the viewer's real ledger: the balance derived by
 * the wallet_balances view and the newest entries under RLS, so the number
 * on screen and the rows beneath it can never disagree.
 *
 * Signed out there is no balance on this page at all: a number beside a
 * currency symbol is read as a fact about the reader before any caption is.
 * An unreadable ledger draws no figure either, because a zero and an
 * unknown look identical and mean opposite things.
 *
 * Add money opens a hosted Paystack checkout, or charges a saved card; the
 * return trip lands here as ?funded=1&reference=rm-fund-..., where the
 * verifier credits the ledger idempotently in case the webhook has not
 * arrived yet. `?action=fund|withdraw|crypto` opens that sheet on arrival.
 */
export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ funded?: string; reference?: string; action?: string }>;
}) {
  const { funded, reference, action } = await searchParams;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.wallet.home;
  const wallet = await getWalletForViewer();
  /* Pots answer "unavailable" until their migration is applied and are
     simply not drawn in that state. */
  const pots = await readPots();
  /* The saved cards, for the Top Up sheet. An unreadable list is an empty
     one here: the hosted window is always still offered. */
  const cards = wallet.live && !wallet.readFailed ? await listPaymentMethods() : null;

  const verifying =
    funded === "1" && typeof reference === "string" && reference.startsWith("rm-fund-")
      ? reference
      : null;

  const initialAction =
    action === "fund" || action === "withdraw" || action === "crypto" ? action : null;

  /* The naira-per-dollar rate, from configuration only. No fallback and no
     constant: with nothing configured the currency toggle does not appear. */
  const parsedRate = Number(process.env.NEXT_PUBLIC_NGN_USD_RATE);
  const usdRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : null;

  return (
    <div className="nf-money mx-auto max-w-2xl">
      {verifying && <FundingVerifier reference={verifying} locale={locale} />}

      {!wallet.live ? (
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Sign in to see your wallet"
            body="Your balance, every payment in and out, and the controls to add money or send it on. Nothing about your money is shown to anybody who is not signed in as you."
            action={
              <EmptyActions
                primary={{ label: "Sign in", href: "/sign-in" }}
                secondary={{ label: "How the wallet works", href: "/help" }}
              />
            }
          />
        </Reveal>
      ) : wallet.readFailed ? (
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Your balance could not be loaded"
            body="Something on our side stopped part way through, so we are not showing a figure rather than showing you one we cannot stand behind. Every movement in and out of your wallet is recorded permanently, so nothing is lost while this is unreadable. Try again in a moment, and tell support if it keeps happening."
            action={
              <EmptyActions
                primary={{ label: "Try again", href: "/wallet" }}
                secondary={{ label: "Contact support", href: "/settings#settings-help" }}
              />
            }
          />
        </Reveal>
      ) : (
        <>
          <Reveal>
            {/* Whether crypto is offered is decided HERE, on the server,
                because the answer is an environment variable a browser must
                never be handed. */}
            <WalletDeck
              locale={locale}
              copy={copy}
              balanceMinor={wallet.balanceMinor}
              entries={wallet.entries}
              breakdown={wallet.breakdown}
              live={wallet.live}
              cards={cards?.ok ? cards.data : []}
              cryptoEnabled={isYellowCardConfigured()}
              usdRate={usdRate}
              initialAction={initialAction}
              settings={<WalletSettingsSheet />}
            />
          </Reveal>

          {pots.state === "ok" && (
            <Reveal delay={120} className="mt-block">
              <PotsSection pots={pots.pots} locale={locale} />
            </Reveal>
          )}

          <Reveal delay={140} className="mt-block">
            <RecentActivity entries={wallet.entries} locale={locale} copy={copy} />
          </Reveal>

          <Reveal delay={180} className="mt-block">
            <TrustStrip copy={copy} />
          </Reveal>
        </>
      )}
    </div>
  );
}
