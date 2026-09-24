import { handleFromRecipientParam } from "@/lib/wallet/request-link";
import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { resolveSession } from "@/lib/actions/session";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import { WalletBack } from "@/components/app/wallet/WalletBack";
import { getWalletForViewer } from "@/lib/wallet/repository";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).walletSend.title,
    robots: { index: false, follow: false },
  };
}

/**
 * /wallet/send, to its governing render 77A54EA3: the balance card with its
 * tiles, the page's head, the form panel, the lit button and the
 * reassurance card, all drawn by `SendFlow`. The render's header row (back,
 * lockup) is the shared app bar, not this page.
 *
 * The balance is read here, on the server, and handed down as the ceiling
 * the compose step checks against. `?to=`, `?amount=` and `?note=` prefill
 * the form: that is how a request shared from /wallet/receive lands.
 */
export default async function WalletSendPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; amount?: string; note?: string }>;
}) {
  const [locale, params, wallet, session] = await Promise.all([
    getLocale(),
    searchParams,
    getWalletForViewer(),
    resolveSession(),
  ]);
  const userId = session.state === "signed-in" ? session.user.id : null;
  const t = getDictionary(locale);
  const copy = t.walletSend;
  /* A request names its requester by handle (lib/wallet/request-link.ts).
     The form is prefilled with the handle itself; the account behind it is
     resolved on the server, as the payer, when the lookup runs and again when
     the money moves. No address is read here, so none can reach the form. */
  const requestedHandle = handleFromRecipientParam(params.to);
  const initialRecipient = requestedHandle
    ? `@${requestedHandle}`
    : typeof params.to === "string"
      ? params.to.slice(0, 254)
      : "";

  return (
    <div className="nf-money mx-auto max-w-2xl">
      <WalletBack />
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
        <SendFlow
          balanceMinor={wallet.balanceMinor}
          locale={locale}
          copy={copy}
          homeCopy={t.wallet.home}
          userId={userId}
          initialEmail={initialRecipient}
          initialAmount={typeof params.amount === "string" ? params.amount.slice(0, 20) : ""}
          initialNote={typeof params.note === "string" ? params.note.slice(0, 140) : ""}
        />
      )}
    </div>
  );
}
