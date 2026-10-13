import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { BalanceView } from "@/components/money/balance/BalanceView";
import { BALANCE_READS } from "../fixtures";

export const dynamic = "force-dynamic";

/**
 * /wallet's signed-in states with fixture reads: ?state=live|quiet|stale|unreachable|not-live|onboarding|onboarding-gaps|pending|error.
 * The Wallet draws its own header (D81); the full harness with every screen
 * is /preview/money/wallet.
 */
export default async function WalletPreview({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const { state = "live" } = await searchParams;
  const read = BALANCE_READS[state] ?? BALANCE_READS.live!;
  return (
    <main className="nf-page">
      <BalanceView read={read} locale="en" />
    </main>
  );
}
