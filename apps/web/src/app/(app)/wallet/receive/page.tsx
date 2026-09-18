import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
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
 * share, and what has come in lately. The send page's other half, in the
 * same register: the header carries the tagline and the glass object.
 *
 * The email is the session's own, because that is the address
 * `transferToUser` resolves a recipient by. The handle comes from the
 * social identity read, which returns "unclaimed" as a state rather than an
 * error, and the card offers the claim instead of showing a blank.
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
      <PageHeader
        title={copy.title}
        subtitle={copy.tagline}
        fallback="/wallet"
        actions={
          <span className="nf-money-hero__object block" aria-hidden="true">
            <BrandIcon name="payment-received" fill priority />
          </span>
        }
      />

      {!wallet.live || email.length === 0 ? (
        <EmptyState
          icon="wallet-secure"
          title={copy.signInTitle}
          body={copy.signInBody}
          action={<EmptyActions primary={{ label: "Sign in", href: "/sign-in" }} />}
        />
      ) : (
        <>
          <ReceiveCard
            email={email}
            handle={identity.state === "claimed" ? identity.identity.handle : null}
            locale={locale}
            copy={copy}
          />
          {/* A statement that could not be read shows no strip at all: an
              empty list under an unreadable ledger is a second false
              statement dressed as an absence. */}
          {!wallet.readFailed && (
            <div className="mt-group">
              <RecentActivity
                entries={wallet.entries.filter((entry) => entry.direction === "credit")}
                locale={locale}
                copy={t.wallet.home}
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
