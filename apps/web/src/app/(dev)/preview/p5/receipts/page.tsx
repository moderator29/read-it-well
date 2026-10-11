import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { TYPE } from "@/components/app/Screen";
import { ReceiptVault } from "@/components/money/ReceiptVault";
import { parseVaultKind, parseVaultQuery, vaultEntries } from "@/lib/money/vault";
import { RECEIPTS_LEDE, RECEIPTS_TITLE } from "@/lib/money/copy";
import { PAYMENTS } from "../fixtures";

export const dynamic = "force-dynamic";

/** /receipts with fixture rows, composed in the route's order. ?kind= and ?q= work as on the route. */
export default async function ReceiptsPreview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const params = await searchParams;
  const kind = parseVaultKind(params.kind);
  const query = parseVaultQuery(params.q);
  return (
    <main className="nf-page nf-md">
      <PageHeader title={RECEIPTS_TITLE} fallback="/preview/p5" />
      <div className="mt-inline space-y-block">
        <p className={TYPE.body}>{RECEIPTS_LEDE}</p>
        <ReceiptVault entries={vaultEntries(PAYMENTS, kind, query)} scanned={PAYMENTS.length} kind={kind} query={query} basePath="/preview/p5/receipts"
          locale="en"
          counts={{ all: vaultEntries(PAYMENTS, "all", query).length, payment: vaultEntries(PAYMENTS, "payment", query).length, refund: vaultEntries(PAYMENTS, "refund", query).length }}
        />
      </div>
    </main>
  );
}
