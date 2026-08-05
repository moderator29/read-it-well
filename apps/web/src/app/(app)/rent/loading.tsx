import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on long-let rentals.
 *
 * Rent queries a different slice of the catalogue than search does and joins
 * each result to its agent conversation, so it is a slower read than the card
 * grid suggests. The explainer paragraph and the trust card above the grid are
 * reserved as well: they sit above the fold, and letting them appear late would
 * push the first row of homes down after the user had begun scanning it.
 */
export default function LoadingRent() {
  return (
    <LoadingShell label="Loading rentals">
      <PageHeaderSkeleton />

      <div className="mt-2 max-w-[52ch] space-y-2">
        <Skeleton height="0.9375rem" radius="sm" />
        <Skeleton width="70%" height="0.9375rem" radius="sm" />
      </div>

      <div className="nf-card mt-4 flex items-start gap-4 p-4">
        <Skeleton width="1.25rem" height="1.25rem" radius="sm" className="shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton height="0.8125rem" radius="sm" />
          <Skeleton width="65%" height="0.8125rem" radius="sm" />
        </div>
      </div>

      {/* The city rail: full-bleed on phones, exactly as the real nav is. */}
      <div className="-mx-5 mt-4 flex gap-2 overflow-hidden px-5 md:-mx-8 md:px-8">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width="7rem" height="2.75rem" radius="pill" className="shrink-0" />
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
