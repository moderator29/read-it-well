import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on a moderation queue.
 *
 * All eight console pages are `force-dynamic` and every one of them awaits
 * Supabase before it can render a word - several of them await two or three
 * reads. Until now that produced a blank main column: the rail and header stayed
 * (they live in `admin/layout.tsx`, which is why this file draws neither), and
 * the queue itself simply did not exist for the length of the round trip.
 *
 * An operator working a queue is doing the same motion dozens of times an hour.
 * The cost of a blank column is not aesthetic - it is that they cannot tell a
 * slow queue from an empty one from a broken one, and all three look identical
 * for the first second.
 *
 * The shape is deliberately the shared queue shape: `mx-auto max-w-3xl`, the
 * `QueueHeader` title and lede, then `nf-card` rows at `space-y-3`. Every queue
 * page on the console is built from those three pieces, so one skeleton is
 * honest for all of them.
 */
export function QueueSkeleton({
  label,
  rows = 4,
  /** `support` renders its resolved column wider than the other queues do. */
  width = "max-w-3xl",
}: {
  label: string;
  rows?: number;
  width?: string;
}) {
  return (
    <LoadingShell label={label} className={`mx-auto w-full ${width}`}>
      <header className="mb-5">
        <Skeleton width="13rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-2" width="100%" height="0.875rem" radius="sm" />
        <Skeleton className="mt-1.5" width="70%" height="0.875rem" radius="sm" />
      </header>

      <ul className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="nf-card p-4 sm:p-5">
            {/* The status pill and timestamp row every queue card opens with. */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton width="5rem" height="1.25rem" radius="pill" />
              <Skeleton width="7rem" height="0.75rem" radius="sm" />
            </div>
            <Skeleton className="mt-2.5" width="60%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2" width="85%" height="0.8125rem" radius="sm" />
            {/* The decision row. Two buttons at the real 40px, so the card's
                height matches and the list below it does not move. */}
            <div className="mt-4 flex gap-2">
              <Skeleton width="6.5rem" height="2.5rem" radius="pill" />
              <Skeleton width="6.5rem" height="2.5rem" radius="pill" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
