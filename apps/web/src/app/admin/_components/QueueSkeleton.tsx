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
 * The shape is deliberately the shared queue shape: `nf-console`, the
 * `QueueHeader` title and lede, then `nf-card` rows at `space-y-3`. Every queue
 * page on the console is built from those three pieces, so one skeleton is
 * honest for all of them.
 */
export function QueueSkeleton({
  label,
  rows = 4,
  /*
   * The skeleton has to be the width the real page will be, or the layout
   * jumps the moment the data lands. Every console page is `nf-console` now,
   * so that is the default; `support` still passes its own.
   */
  width = "nf-console",
}: {
  label: string;
  rows?: number;
  width?: string;
}) {
  return (
    <LoadingShell label={label} className={`w-full ${width}`}>
      {/* The heights below track the real header: `nf-h1` for the title and
          `nf-lede` for the two lines under it, so nothing shifts when the data
          lands and the type scale stays the single source for both. */}
      <header className="mb-heading">
        <Skeleton width="13rem" height="var(--nf-text-h1)" radius="sm" />
        <Skeleton className="mt-row" width="100%" height="var(--nf-text-body-lg)" radius="sm" />
        <Skeleton
          className="mt-inline-tight"
          width="70%"
          height="var(--nf-text-body-lg)"
          radius="sm"
        />
      </header>

      <ul className="nf-queue-list">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="nf-card p-card">
            {/* The status pill and timestamp row every queue card opens with. */}
            <div className="flex flex-wrap items-center gap-inline">
              <Skeleton width="5rem" height="1.25rem" radius="pill" />
              <Skeleton width="7rem" height="var(--nf-text-caption)" radius="sm" />
            </div>
            <Skeleton className="mt-row" width="60%" height="var(--nf-text-h4)" radius="sm" />
            <Skeleton className="mt-row" width="85%" height="var(--nf-text-body)" radius="sm" />
            {/* The decision row. Two buttons at the real 40px, so the card's
                height matches and the list below it does not move. */}
            <div className="mt-group flex gap-inline">
              <Skeleton width="6.5rem" height="2.5rem" radius="pill" />
              <Skeleton width="6.5rem" height="2.5rem" radius="pill" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
