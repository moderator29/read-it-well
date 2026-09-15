import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { BalanceCard } from "@/components/app/wallet/BalanceCard";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { WalletSettingsSheet } from "@/components/app/wallet/WalletSettingsSheet";
import { getWalletForViewer } from "@/lib/wallet/repository";
import { isYellowCardConfigured } from "@/lib/payments/yellowcard";
import { readPots } from "@/lib/wallet/pots";
import { PotsSection } from "@/components/app/wallet/PotsSection";
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
  /*
   * Pots answer "unavailable" until the migration is applied, and the section
   * is simply not drawn in that state - the same gate the crypto top-up uses,
   * for the same reason. So this ships ahead of the SQL and lights up by
   * itself the moment the SQL is run, with nothing to redeploy.
   */
  const pots = await readPots();

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
        <PageScene art="wallet-secure" />
        {/*
          Settings live at the TOP of the wallet, beside its title, which is
          where a user looks for them. The trust strip that used to sit at the
          very bottom of this page - below the entire transaction history - now
          lives inside that sheet along with everything else about how the
          wallet behaves.
        */}
        {/* The settings control rides the header's own actions slot rather
            than being a second element in a flex row beside it. The row it used
            to sit in had to nudge itself down by `mt-1` to line up with a title
            it was not actually inside; inside the header there is nothing to
            align to by hand. */}
        <PageHeader title={t.nav.wallet} actions={<WalletSettingsSheet />} />
      </div>

      {verifying && <FundingVerifier reference={verifying} locale={locale} />}

      {!wallet.live ? (
        /*
         * THE PLATFORM EMPTY STATE, not a third hand-built one.
         *
         * Both of this page's non-balance states were an `nf-card p-6 sm:p-8`
         * wrapping a 64px object, an h3, a paragraph and a pair of buttons: a
         * bordered box drawn around a message reporting that there is nothing
         * to draw a box around, which is the shape every other screen in the
         * product stopped using. `EmptyState` is that shape, at 112px with the
         * copy a tier up, and two containers leave this screen.
         *
         * ONE ACTION, NOT TWO. Signing in is what this state is about; drifting
         * off to browse places is a way out rather than an answer, so it is the
         * quiet link beside the button rather than a second filled peer.
         */
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Your wallet is behind your sign in"
            body="Sign in to see your balance, add money, send it on and read every payment in and out. Nothing about your money is shown to anybody who is not signed in as you."
            action={
              <ButtonLink href="/sign-in" variant="primary">
                Sign in
              </ButtonLink>
            }
            secondary={
              <ButtonLink href="/search" variant="ghost">
                Explore places
              </ButtonLink>
            }
          />
        </Reveal>
      ) : wallet.readFailed ? (
        /*
         * THE LEDGER COULD NOT BE READ, AND THIS PAGE SAYS SO.
         *
         * This branch is the whole lesson of the funding incident, and for a
         * while it was the part still missing. The reader was taught to report
         * a failure instead of swallowing it, and then the screen carried on
         * printing whatever came back, which on a failure is zero.
         *
         * A zero balance and an unreadable balance look identical and mean
         * opposite things. One says you have no money. The other says we do
         * not currently know, which is the only honest thing to say and the
         * one thing a person can act on: they can stop, and they can ask.
         *
         * So no figure is drawn here at all. Not a zero, not a dash, not a
         * skeleton that will settle into a number. A balance is a claim about
         * somebody's money, and when we cannot make that claim we do not get
         * to make a quieter version of it.
         *
         * The history is withheld for the same reason: an empty list under a
         * missing balance reads as "no transactions", which is a second false
         * statement dressed as an absence.
         */
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Your balance could not be loaded"
            body="Something on our side stopped part way through, so we are not showing a figure rather than showing you one we cannot stand behind. Every movement in and out of your wallet is recorded permanently, so nothing is lost while this is unreadable. Try again in a moment, and tell support if it keeps happening."
            action={
              <ButtonLink href="/wallet" variant="primary">
                Try again
              </ButtonLink>
            }
            secondary={
              /* /settings, not an invented /settings/support: the support chat
                 is rendered there, and a dead link on the screen that tells
                 somebody to ask for help is the worst place to put one.

                 The three stacked paragraphs this used to carry are two
                 sentences in the body above, with nothing dropped. Three
                 paragraphs of reassurance is more reading than somebody staring
                 at a missing balance is going to do. */
              <ButtonLink href="/settings" variant="ghost">
                Contact support
              </ButtonLink>
            }
          />
        </Reveal>
      ) : (
        <>
      <Reveal>
        <BalanceCard
          balanceMinor={wallet.balanceMinor}
          entries={wallet.entries}
          breakdown={wallet.breakdown}
          locale={locale}
          usdRate={usdRate}
        />
      </Reveal>

      <Reveal delay={80} className="mt-group">
        {/* Whether crypto is offered is decided HERE, on the server, because
            the answer is an environment variable a browser must never be
            handed. The deck defaults it to false, so a page that forgets to
            pass it hides the control rather than showing a dead one. */}
        <WalletDeck
          locale={locale}
          balanceMinor={wallet.balanceMinor}
          live={wallet.live}
          cryptoEnabled={isYellowCardConfigured()}
        />
      </Reveal>

      {/*
        THE STATEMENT MOVED TO ITS OWN SCREEN.

        It was rendered here in full, with its filters, directly under the
        action deck - so on any wallet with use in it the page became a
        balance, three buttons and then an unbounded list, and everything
        below sat behind a scroll. Three rows and a way in is what a person
        wants at a glance; the record lives at /wallet/transactions.
      */}
      {pots.state === "ok" && (
        <Reveal delay={120} className="mt-block">
          <PotsSection pots={pots.pots} locale={locale} />
        </Reveal>
      )}

      <Reveal delay={140} className="mt-block">
        <RecentActivity entries={wallet.entries} locale={locale} />
      </Reveal>
        </>
      )}
    </div>
  );
}
