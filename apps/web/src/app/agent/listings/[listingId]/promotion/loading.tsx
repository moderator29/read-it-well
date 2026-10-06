import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on a listing's promotion results: the title and its two-line
 * lede, the notice card, the section label, then the ten figure rows at a
 * one-line row's height (44px, as `.nf-promo-results__row` draws them). Without
 * this file the wait borrowed `/agent/listings`'s own skeleton, a filter rail
 * and photograph rows this page does not have (X2, point 12).
 */
export default function LoadingPromotionResults() {
  return (
    <AgentScreenSkeleton label="Loading this listing's promotion results">
      <div className="mx-auto flex max-w-2xl flex-col gap-group py-lg">
        <div>
          <Skeleton width="12rem" height="1.75rem" radius="sm" />
          <Skeleton className="mt-inline" width="18rem" height="2.5rem" radius="sm" />
        </div>
        <Skeleton height="9rem" radius="lg" />
        <div>
          <Skeleton width="8rem" height="1rem" radius="sm" />
          <div className="mt-sm space-y-xs">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} height="2.75rem" radius="sm" />
            ))}
          </div>
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
