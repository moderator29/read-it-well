import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { WaitingRoom } from "@/components/money/balance/balance-ui";
import { movementReceipt } from "@/components/money/movement-receipt";
import { ReceiptActions } from "@/components/money/ReceiptActions";
import { WAITING } from "../fixtures";

export const dynamic = "force-dynamic";

/** The waiting room in each state: ?state=processing|unknown|completed|failed|deposit|sent|added */
export default async function WaitingPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const { state = "processing" } = await searchParams;
  const m = WAITING[state] ?? WAITING.processing!;
  return (
    <main className="nf-page nf-md">
      <div className="mt-block">
        <WaitingRoom movement={m} locale="en" kind={m.kind === "deposit" ? "deposit" : m.kind === "transfer_out" ? "send" : "withdrawal"} />
        {m.status === "completed" ? <ReceiptActions receipt={movementReceipt(m, "en")} print={false} testId="balance-receipt" /> : null}
      </div>
    </main>
  );
}
