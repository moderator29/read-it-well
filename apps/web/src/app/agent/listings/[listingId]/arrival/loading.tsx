import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on a stay's arrival charges.
 *
 * The page's column (`max-w-2xl`): the small link back to the listings, the
 * `nf-h2` title, the listing's name and the lede, then the charges form, a
 * few labelled fields and the save pill.
 */
export default function LoadingListingArrival() {
  return (
    <AgentScreenSkeleton label="Loading the arrival charges">
      <div className="mx-auto max-w-2xl">
        <Skeleton width="6rem" height="0.75rem" radius="sm" />
        <Skeleton className="mt-sm" width="13rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-2xs" width="45%" height="0.8125rem" radius="sm" />
        <Skeleton className="mt-xs" width="90%" height="1rem" radius="sm" />
        <div className="mt-lg space-y-md">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton width="8rem" height="0.875rem" radius="sm" />
              <Skeleton className="mt-xs" height="3.25rem" radius="lg" />
            </div>
          ))}
          <Skeleton height="3rem" radius="pill" />
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
