import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/app/Screen";
import { TransactionsSection } from "@/components/app/wallet/TransactionsSection";
import { getWalletForViewer } from "@/lib/wallet/repository";

export const metadata: Metadata = { title: "Transactions" };

/**
 * The full statement, on its own screen.
 *
 * ---------------------------------------------------------------------------
 * WHY IT MOVED OFF THE WALLET HOME.
 *
 * The history was rendered inline under the action deck, so the wallet page
 * was a balance, three buttons and then an unbounded list. On a wallet with
 * any use in it that pushes everything else off the screen, and it puts the
 * thing somebody opens the wallet to DO - add money, send money - above a
 * scroll they have to get past to reach the bottom of the page.
 *
 * The home keeps a short recent strip, which is what a person actually wants
 * at a glance, and the full record with its filters lives here, one tap away.
 * That is the shape every bank app on a Nigerian phone uses, and it is the
 * shape the owner asked for.
 *
 * The read is the SAME `getWalletForViewer` the home calls, so the two screens
 * cannot disagree about what is in the ledger, and the same three states are
 * honoured: signed out, unreadable, and real. In particular an unreadable
 * ledger shows no list at all - an empty history under a failed read says "no
 * transactions", which is a false statement dressed as an absence.
 */
export default async function WalletTransactionsPage() {
  const locale = await getLocale();
  const wallet = await getWalletForViewer();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Transactions" fallback="/wallet" />

      {!wallet.live ? (
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Your transactions are behind your sign in"
            body="Sign in to read every payment in and out of your wallet. Nothing about your money is shown to anybody who is not signed in as you."
            action={
              <ButtonLink href="/sign-in" variant="primary">
                Sign in
              </ButtonLink>
            }
          />
        </Reveal>
      ) : wallet.readFailed ? (
        <Reveal>
          <EmptyState
            icon="wallet-secure"
            title="Your transactions could not be loaded"
            body="Something on our side stopped part way through, so we are not showing a list rather than showing you an empty one that would read as nothing having happened. Every movement in and out of your wallet is recorded permanently, so nothing is lost while this is unreadable."
            action={
              <ButtonLink href="/wallet/transactions" variant="primary">
                Try again
              </ButtonLink>
            }
          />
        </Reveal>
      ) : (
        <Reveal>
          <TransactionsSection entries={wallet.entries} locale={locale} heading={false} />
        </Reveal>
      )}
    </div>
  );
}
