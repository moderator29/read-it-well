import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the wallet.
 *
 * The balance is read on the server before anything renders. A wallet that
 * shows nothing for a second is the most alarming empty state on the platform -
 * a user does not read it as "loading", they read it as "my money is gone" -
 * so the balance card is reserved at its full height and the figure lands
 * inside a box that was already there.
 *
 * The action deck and the transaction list follow at their real rhythm
 * (`mt-4`, `mt-8`), because the balance arriving must not push them.
 */
export default function LoadingWallet() {
  return (
    <LoadingShell label="Loading your wallet" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      {/* The balance card. */}
      <div className="nf-card p-5">
        <Skeleton width="7rem" height="0.8125rem" radius="sm" />
        <Skeleton className="mt-3" width="60%" height="2.5rem" radius="sm" />
        <Skeleton className="mt-3" width="45%" height="0.8125rem" radius="sm" />
      </div>

      {/* Fund / withdraw / send, at the real 48px control height. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height="3rem" radius="lg" />
        ))}
      </div>

      <div className="mt-8">
        <Skeleton width="9rem" height="1.125rem" radius="sm" />
        <ul className="nf-card mt-3 divide-y divide-[var(--nf-border-subtle)] p-0">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton circle width="2.25rem" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="55%" height="0.875rem" radius="sm" />
                <Skeleton className="mt-1.5" width="35%" height="0.75rem" radius="sm" />
              </div>
              <Skeleton width="4.5rem" height="0.9375rem" radius="sm" className="shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
