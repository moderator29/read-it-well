import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PaymentGate } from "@/components/app/agreements/PaymentGate";

export const dynamic = "force-dynamic";

const ID = "00000000-0000-4000-8000-00000000a001";

/** "Payment is not open yet" at every step it can say: ?status=awaiting_parties|in_review|rejected|cancelled|paid|none */
export default async function GatePreview({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const { status = "in_review" } = await searchParams;
  const agreement =
    status === "none"
      ? null
      : { id: ID, status, reason: status === "rejected" ? "The caution deposit in the terms does not match the listing. Change it to the listed figure and confirm again." : null };
  return (
    <main className="nf-page nf-md">
      <div className="mt-block">
        <PaymentGate agreement={agreement} />
      </div>
    </main>
  );
}
