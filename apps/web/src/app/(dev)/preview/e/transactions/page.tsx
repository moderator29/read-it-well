import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { TransactionsSection } from "@/components/app/wallet/TransactionsSection";
import { ENTRIES } from "../fixtures";

export default function PreviewTransactions() {
  const t = getDictionary("en");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Transactions" fallback="/wallet" />
      <TransactionsSection entries={ENTRIES} locale="en" copy={t.wallet.home} heading={false} />
    </div>
  );
}
