import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Reveal } from "@/components/site/Reveal";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { LiveWallet } from "@/components/app/wallet/LiveWallet";
import { WalletBack } from "@/components/app/wallet/WalletBack";
import { resolveSession } from "@/lib/actions/session";
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
 * To its governing render (6AF37222): the balance card with its four tiles,
 * Quick Actions, then Recent Transactions; the savings pots follow, below
 * what the render draws, because they are real money and the render has no
 * place for them. The render's header row (back, lockup, bell, profile) is
 * the shared app bar, not this page. The trust strip belongs to the send
 * render and is drawn there, not here. Every figure is the viewer's real ledger: the balance derived by
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
 *
 * LIVE. `LiveWallet` listens for this person's wallet notifications (the
 * ledger trigger writes one for every settled movement) and re-reads the
 * page, so money that lands while the page is open appears without a reload.
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
  const [wallet, session] = await Promise.all([getWalletForViewer(), resolveSession()]);
  const userId = session.state === "signed-in" ? session.user.id : null;
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
      {/* DOC-21: the screen's name. The balance card is the visual title and
          carries no heading, so without this the page had no h1 at all
          (axe `page-has-heading-one`). */}
      <h1 className="sr-only">{t.a11y.walletHeading}</h1>
      <WalletBack />
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
              settings={<WalletSettingsSheet
                card={{ title: copy.settingsLink, sub: copy.quickSettingsSub }}
                heading={copy.settingsHeading}
              />}
            />
          </Reveal>

          <Reveal delay={120} className="nf-wallet-section">
            <RecentActivity entries={wallet.entries} locale={locale} copy={copy} />
          </Reveal>

          {pots.state === "ok" && (
            <Reveal delay={160} className="mt-block">
              <PotsSection pots={pots.pots} locale={locale} />
            </Reveal>
          )}

          <LiveWallet userId={userId} />
        </>
      )}
    </div>
  );
}
