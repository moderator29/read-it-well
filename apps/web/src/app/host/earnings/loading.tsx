import { Skeleton } from "@/components/ui/Skeleton";
import { ListGroupSkeleton, SummaryCardSkeleton } from "@/components/app/ScreenSkeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";

/**
 * The wait, on the host's earnings.
 *
 * The page's own column (`max-w-2xl`): the `nf-h2` title and the one line
 * about payouts, the earnings summary with its figure, the payment rows, and
 * the statements group under them. Covers the statement screen too, which
 * has the same title, figure and rows.
 */
export default function LoadingHostEarnings() {
  return (
    <HostScreenSkeleton label="Loading your earnings">
      <div className="mx-auto max-w-2xl" aria-hidden="true">
        <Skeleton width="8rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-xs" height="1rem" radius="sm" />
        <Skeleton className="mt-2xs mb-block" width="60%" height="1rem" radius="sm" />
        <SummaryCardSkeleton bar={false} />
        <ListGroupSkeleton rows={4} className="mt-block" />
        <ListGroupSkeleton rows={2} className="mt-block" />
      </div>
    </HostScreenSkeleton>
  );
}
