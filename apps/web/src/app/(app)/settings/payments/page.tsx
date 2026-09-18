import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { Cards } from "@/components/app/payments/Cards";
import { BankAccounts } from "@/components/app/payments/BankAccounts";
import { resolveSession } from "@/lib/actions/session";
import { listPaymentMethods } from "@/lib/payments/methods-actions";
import { listBankAccounts } from "@/lib/payments/bank-accounts-actions";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: getDictionary(await getLocale()).paymentsPage.title,
    robots: { index: false, follow: false },
  };
}

/* A list of somebody's cards is never served from a cache. */
export const dynamic = "force-dynamic";

/**
 * /settings/payments: "Payment methods". Shared by both sides, because both
 * pay and both are paid. Two groups in the settings grammar: the cards you
 * pay with, and the bank accounts you are paid into.
 *
 * Both reads are server actions returning the envelope, so a failed read is
 * a `readFailed` flag on its group rather than an empty list pretending to be
 * the truth. Each group says so in its own words and the other still renders.
 */
export default async function PaymentsPage() {
  const [locale, session] = await Promise.all([getLocale(), resolveSession()]);
  const t = getDictionary(locale);
  const copy = t.paymentsPage;

  if (session.state !== "signed-in") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={copy.title} fallback="/settings" />
        <EmptyState
          icon="card-lock"
          title={copy.signInTitle}
          body={copy.signInBody}
          action={<EmptyActions primary={{ label: "Sign in", href: "/sign-in" }} />}
        />
      </div>
    );
  }

  const [cards, accounts] = await Promise.all([listPaymentMethods(), listBankAccounts()]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/settings" />
      <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
      <div className="space-y-block">
        <Cards cards={cards.ok ? cards.data : []} readFailed={!cards.ok} copy={copy} />
        <BankAccounts
          accounts={accounts.ok ? accounts.data : []}
          readFailed={!accounts.ok}
          copy={copy}
        />
      </div>
    </div>
  );
}
