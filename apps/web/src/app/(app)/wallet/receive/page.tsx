import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { ReceiveCard } from "@/components/app/wallet/ReceiveCard";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { resolveSession } from "@/lib/actions/session";
import { loadAccountSocialIdentity } from "@/lib/profile/social-identity";
import { getWalletForViewer } from "@/lib/wallet/repository";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).walletReceive.title,
    robots: { index: false, follow: false },
  };
}

/**
 * /wallet/receive. Your handle, the address money is sent to, a request to
 * share, and what has come in lately. Its own page off the tab bar, returning
 * to the wallet home.
 *
 * The email is the session's own, because that is the address
 * `transferToUser` resolves a recipient by. The handle comes from the social
 * identity read, which returns "unclaimed" as a state rather than an error,
 * and the card offers the claim instead of showing a blank.
 *
 * The incoming strip is the statement filtered to credits. It shares
 * `RecentActivity` with the wallet home so a movement is drawn the same way
 * on both, and it says so in its own heading.
 */
export default async function WalletReceivePage() {
  const [locale, session, wallet, identity] = await Promise.all([
    getLocale(),
    resolveSession(),
    getWalletForViewer(),
    loadAccountSocialIdentity(),
  ]);
  const t = getDictionary(locale);
  const copy = t.walletReceive;
  const email = session.state === "signed-in" ? (session.user.email ?? "") : "";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/wallet" />

      {!wallet.live || email.length === 0 ? (
        <EmptyState
          icon="wallet-secure"
          title={copy.signInTitle}
          body={copy.signInBody}
          action={<EmptyActions primary={{ label: "Sign in", href: "/sign-in" }} />}
        />
      ) : (
        <>
          <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
          <ReceiveCard
            email={email}
            handle={identity.state === "claimed" ? identity.identity.handle : null}
            locale={locale}
            copy={copy}
          />
          {/* A statement that could not be read shows no strip at all, for the
              wallet home's reason: an empty list under an unreadable ledger is
              a second false statement dressed as an absence. */}
          {!wallet.readFailed && (
            <div className="mt-block">
              <RecentActivity
                entries={wallet.entries.filter((entry) => entry.direction === "credit")}
                locale={locale}
                title={copy.recentTitle}
                empty={copy.recentEmpty}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
