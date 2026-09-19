import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import { PaymentMethodsBlock } from "@/components/app/payments/PaymentMethodsBlock";
import { resolveSession } from "@/lib/actions/session";

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
 * pay and both are paid. The one block, on its own page with its lede; the
 * same block sits in the settings home's slot.
 */
export default async function PaymentsPage() {
  const [locale, session] = await Promise.all([getLocale(), resolveSession()]);
  const t = getDictionary(locale);
  const copy = t.paymentsPage;

  if (session.state !== "signed-in") {
    return (
      <div className="nf-money mx-auto max-w-2xl">
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

  return (
    <div className="nf-money mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/settings" />
      <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
      <PaymentMethodsBlock />
      <p className={`mt-row px-2xs ${TYPE.caption}`}>{copy.cardsNote}</p>
    </div>
  );
}
