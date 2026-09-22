import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the wallet.
 *
 * The balance is read on the server before anything renders. A wallet that
 * shows nothing for a second is the most alarming empty state on the
 * platform, so the hero card is reserved at its real height: label, figure,
 * change line and the four tiles, then the quick actions rail and the
 * recent card at the screen's own rhythm, so the balance arriving pushes
 * nothing.
 */
export default function LoadingWallet() {
  return (
    <LoadingShell label="Loading your wallet" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      <div className="nf-card nf-wallet-hero p-card-sm sm:p-card">
        <Skeleton width="7rem" height="0.90625rem" radius="sm" />
        <Skeleton className="mt-inline" width="58%" height="2.5rem" radius="sm" />
        <Skeleton className="mt-inline" width="40%" height="0.8125rem" radius="sm" />
        <div className="nf-wallet-tiles mt-block">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height="5.25rem" radius="lg" />
          ))}
        </div>
      </div>

      <div className="mt-block">
        <Skeleton width="8rem" height="1.25rem" radius="sm" />
        <div className="nf-wallet-quick mt-heading">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} width="10.5rem" height="8.25rem" radius="xl" className="shrink-0" />
          ))}
        </div>
      </div>

      <div className="nf-card mt-block p-card-sm">
        <Skeleton width="10rem" height="1.25rem" radius="sm" />
        <ul className="mt-row divide-y divide-[var(--nf-divider)]">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-md py-row">
              <Skeleton width="3rem" height="3rem" radius="pill" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="55%" height="1rem" radius="sm" />
                <Skeleton className="mt-inline-tight" width="35%" height="0.8125rem" radius="sm" />
              </div>
              <Skeleton width="4.5rem" height="1rem" radius="sm" className="shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
