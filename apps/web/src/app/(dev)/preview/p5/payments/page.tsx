import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { PaymentsView } from "@/components/money/PaymentsView";
import { PAYMENTS } from "../fixtures";

export const dynamic = "force-dynamic";

/** /payments with fixture rows: ?state=empty for the designed empty state, ?show=refund for a filter. */
export default async function PaymentsPreview({ searchParams }: { searchParams: Promise<{ state?: string; show?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const { state, show } = await searchParams;
  const empty = state === "empty";
  const entries = empty ? [] : PAYMENTS;
  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={getDictionary("en").experienceMoney.payments.title} fallback="/preview/p5" />
      <PaymentsView
        summary={empty ? { paidMinor: 0, payments: 0, refundedMinor: 0 } : { paidMinor: 2_280_000_00, payments: 3, refundedMinor: 120_000_00 }}
        entries={entries}
        nextBefore={null}
        before={null}
        balances={{ state: "absent" }}
        locale="en"
        show={show ?? null}
      />
    </main>
  );
}
