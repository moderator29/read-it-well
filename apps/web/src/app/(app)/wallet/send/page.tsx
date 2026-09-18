import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import { getWalletForViewer } from "@/lib/wallet/repository";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).walletSend.title,
    robots: { index: false, follow: false },
  };
}

/**
 * /wallet/send. Its own page with its own header, off the tab bar: a
 * movement of money is a task with a beginning and an end, and the wallet
 * home is where it returns to.
 *
 * The balance is read here, on the server, and handed down as the ceiling the
 * compose step checks against. A wallet that could not be read gets no send
 * form at all, for the same reason the wallet home draws no figure then: a
 * send against a number we cannot stand behind is not a send we take.
 *
 * `?to=`, `?amount=` and `?note=` prefill the form. That is how a request
 * shared from /wallet/receive lands: the link opens this page with the
 * recipient and the amount already in place and nothing sent until the person
 * has read it and confirmed.
 */
export default async function WalletSendPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; amount?: string; note?: string }>;
}) {
  const [locale, params, wallet] = await Promise.all([
    getLocale(),
    searchParams,
    getWalletForViewer(),
  ]);
  const t = getDictionary(locale);
  const copy = t.walletSend;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/wallet" />

      {!wallet.live ? (
        <EmptyState
          icon="wallet-secure"
          title={copy.signInTitle}
          body={copy.signInBody}
          action={<EmptyActions primary={{ label: "Sign in", href: "/sign-in" }} />}
        />
      ) : wallet.readFailed ? (
        <EmptyState
          icon="wallet-secure"
          title={copy.unreadableTitle}
          body={copy.unreadableBody}
          action={
            <EmptyActions
              primary={{ label: copy.backToWallet, href: "/wallet" }}
              secondary={{ label: "Contact support", href: "/settings#settings-help" }}
            />
          }
        />
      ) : (
        <>
          <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
          <SendFlow
            balanceMinor={wallet.balanceMinor}
            locale={locale}
            copy={copy}
            initialEmail={typeof params.to === "string" ? params.to.slice(0, 254) : ""}
            initialAmount={typeof params.amount === "string" ? params.amount.slice(0, 20) : ""}
            initialNote={typeof params.note === "string" ? params.note.slice(0, 140) : ""}
          />
        </>
      )}
    </div>
  );
}
