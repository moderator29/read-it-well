import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { RefundsView } from "@/components/money/RefundsView";
import { REFUNDS_TITLE } from "@/lib/money/copy";
import { PAYMENTS } from "../fixtures";

export const dynamic = "force-dynamic";

/** /refunds with fixture rows: ?state=empty for the designed empty state. */
export default async function RefundsPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const empty = (await searchParams).state === "empty";
  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={REFUNDS_TITLE} fallback="/preview/p5" />
      <RefundsView entries={empty ? [] : PAYMENTS} nextBefore={null} before={null} locale="en" />
    </main>
  );
}
