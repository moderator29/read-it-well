import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { PageHeader } from "@/components/app/PageHeader";
import { BalanceView } from "@/components/money/balance/BalanceView";
import { BALANCE_TITLE } from "@/lib/money/balance-copy";
import { BALANCE_READS } from "../../p5/fixtures";

export const dynamic = "force-dynamic";

/**
 * THE WALLET, AS A MEMBER SEES IT, WITH SAMPLE DATA (the founder, 7 October:
 * "Build the front end and the wallet design, let me see it, even though the
 * key is not connected"). The real `/wallet` components drawn with the P5
 * fixture reads: `?state=live` (the default: a connected wallet with
 * activity), `quiet`, `stale`, `unreachable`, `not-live` (what /wallet shows
 * today), `onboarding`, `error`. Development only; the preview layout 404s it
 * everywhere else, and every figure here is invented and labelled so.
 */
export default async function WalletSample({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const { state = "live" } = await searchParams;
  const read = BALANCE_READS[state] ?? BALANCE_READS.live!;
  return (
    /* The member shell's own content wrapper, as the P5 deck draws it, so the
       wallet is judged with the gutter and the wash it has in the product. */
    <div className="nf-soft-top min-h-dvh">
      <div className="nf-shell nf-page-stage py-section-tight">
        <main className="nf-page nf-md nf-history">
          <PageHeader title={BALANCE_TITLE} fallback="/preview/money" />
          <p role="note" className="nf-caption mt-inline text-[var(--nf-content-muted)]" data-testid="wallet-sample-note">
            Sample data for design review. No figure here is real.
          </p>
          <BalanceView read={read} locale="en" />
        </main>
      </div>
    </div>
  );
}
