import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSession } from "@/lib/actions/session";
import { listPaymentMethods } from "@/lib/payments/methods-actions";
import { listBankAccounts } from "@/lib/payments/bank-accounts-actions";
import { PaymentMethodsPanel } from "./PaymentMethodsPanel";

/**
 * The payment methods block, as a server component on the real reads.
 *
 * Rendered on `/settings/payments` and in the slot the settings home leaves
 * for it (import from `@/components/app/payments/PaymentMethodsBlock`).
 * Both reads are server actions returning the envelope, so a failed read is
 * a flag on its group rather than an empty list pretending to be the truth;
 * the panel says so in its own words and the other group still renders.
 *
 * Signed out it renders nothing at all: the settings home already carries
 * the sign-in offer, and a block about somebody's cards has no honest
 * signed-out form.
 */
export async function PaymentMethodsBlock() {
  const [locale, session] = await Promise.all([getLocale(), resolveSession()]);
  if (session.state !== "signed-in") return null;
  const copy = getDictionary(locale).paymentsPage;
  const [cards, accounts] = await Promise.all([listPaymentMethods(), listBankAccounts()]);
  return (
    <PaymentMethodsPanel
      cards={cards.ok ? cards.data : []}
      accounts={accounts.ok ? accounts.data : []}
      cardsFailed={!cards.ok}
      accountsFailed={!accounts.ok}
      copy={copy}
    />
  );
}
