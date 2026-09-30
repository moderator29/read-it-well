import { Skeleton } from "@/components/ui/Skeleton";
import { LargeHeaderSkeleton, ListGroupSkeleton, SummaryCardSkeleton } from "@/components/app/ScreenSkeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";
import "../host-desk.css";

/**
 * The wait, on Decide by.
 *
 * `DecideView`'s shape: the large title with its count line, then the
 * `nf-decide` grid (one column on a phone, the queue beside a 20rem aside on
 * a desk). The queue is the summary card and a few request rows, each a
 * toned plate, two lines, the clock on the right and the bar under it; the
 * aside is the two list groups that explain the clock.
 */
export default function LoadingHostDecide() {
  return (
    <HostScreenSkeleton label="Loading the requests waiting for you" wide>
      <LargeHeaderSkeleton />
      <div className="nf-decide" aria-hidden="true">
        <div className="grid gap-md">
          <SummaryCardSkeleton />
          <ul className="nf-decide__list">
            {Array.from({ length: 2 }, (_, i) => (
              <li key={i} className="nf-decide__row">
                <div className="flex items-start gap-sm">
                  <Skeleton width="2.75rem" height="2.75rem" radius="md" className="shrink-0" />
                  <div className="nf-decide__what">
                    <Skeleton width="65%" height="1rem" radius="sm" />
                    <Skeleton className="mt-2xs" width="45%" height="0.8125rem" radius="sm" />
                  </div>
                  <Skeleton width="3.5rem" height="1.25rem" radius="sm" className="shrink-0" />
                </div>
                <Skeleton height="0.375rem" radius="pill" />
                <Skeleton width="85%" height="0.75rem" radius="sm" />
                <div className="flex gap-xs">
                  <Skeleton height="2.75rem" radius="pill" />
                  <Skeleton height="2.75rem" radius="pill" />
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-md">
          <ListGroupSkeleton rows={3} />
          <ListGroupSkeleton rows={2} />
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
