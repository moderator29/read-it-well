import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { PayoutsView } from "@/components/money/PayoutsView";
import { PAYOUTS_TITLE } from "@/lib/money/copy";
import { PAYOUTS } from "../fixtures";

export const dynamic = "force-dynamic";

/** /payouts with fixture rows: ?state=empty for the designed empty state. */
export default async function PayoutsPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const empty = (await searchParams).state === "empty";
  return (
    <main className="nf-page nf-md nf-history">
      <PageHeader title={PAYOUTS_TITLE} fallback="/preview/p5" />
      <PayoutsView
        summary={empty ? { earnedMinor: 0, grossMinor: 0, payments: 0, reversedMinor: 0, netMinor: 0 } : { earnedMinor: 2_073_600_00, grossMinor: 2_160_000_00, payments: 2, reversedMinor: 115_200_00, netMinor: 1_958_400_00 }}
        entries={empty ? [] : PAYOUTS}
        nextBefore={null}
        before={null}
        locale="en"
        now={Date.parse("2026-10-07T10:00:00Z")}
      />
    </main>
  );
}
