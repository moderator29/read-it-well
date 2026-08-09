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
 * The action deck and the transaction list follow at the screen's real rhythm,
 * `mt-group` and `mt-block`, because the balance arriving must not push them.
 *
 * TWO THINGS HERE NO LONGER MATCH THE SCREEN AND ARE FIXED WITH IT.
 *
 * The deck is one full-width primary with two quiet buttons under it, not three
 * equal tiles in a row: adding money is what somebody opens this screen to do
 * and it is the only one of the three that works on an empty wallet. And the
 * history is hairline rows on the ground rather than a card, because a card per
 * day group was six glass surfaces for one continuous statement.
 */
export default function LoadingWallet() {
  return (
    <LoadingShell label="Loading your wallet" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />

      {/* The balance card, at the padding the real card carries. */}
      <div className="nf-card p-card sm:p-cell">
        <Skeleton width="7rem" height="0.90625rem" radius="sm" />
        <Skeleton className="mt-row" width="60%" height="2.5rem" radius="sm" />
        <Skeleton className="mt-inline" width="45%" height="0.8125rem" radius="sm" />
      </div>

      {/* Add money, then withdraw and transfer, at the real 56px control
          height rather than the 48px this used to reserve. */}
      <div className="mt-group">
        <Skeleton height="3.5rem" radius="lg" />
        <div className="mt-row grid grid-cols-2 gap-row">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} height="3.5rem" radius="lg" />
          ))}
        </div>
      </div>

      <div className="mt-block">
        <Skeleton width="9rem" height="1.125rem" radius="sm" />
        <ul className="mt-heading divide-y divide-[var(--nf-border-subtle)]">
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="flex items-center gap-md py-row">
              <Skeleton width="2.5rem" height="2.5rem" radius="sm" className="shrink-0" />
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
