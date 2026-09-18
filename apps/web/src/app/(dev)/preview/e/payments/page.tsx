import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { TYPE } from "@/components/app/Screen";
import { PaymentMethodsPanel } from "@/components/app/payments/PaymentMethodsPanel";
import { ACCOUNTS, CARDS } from "../fixtures";

export default function PreviewPayments() {
  const copy = getDictionary("en").paymentsPage;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={copy.title} fallback="/settings" />
      <p className={`mb-block ${TYPE.body}`}>{copy.lede}</p>
      <PaymentMethodsPanel cards={CARDS} accounts={ACCOUNTS} cardsFailed={false} accountsFailed={false} copy={copy} />
      <p className={`mt-row px-2xs ${TYPE.caption}`}>{copy.cardsNote}</p>
    </div>
  );
}
