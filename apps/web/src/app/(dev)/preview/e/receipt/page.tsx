import { PageHeader } from "@/components/app/PageHeader";
import { Receipt } from "@/components/app/wallet/Receipt";
import { ENTRIES } from "../fixtures";

export default function PreviewReceipt() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Receipt" fallback="/wallet/transactions" />
      <Receipt entry={ENTRIES[3]!} locale="en" />
    </div>
  );
}
