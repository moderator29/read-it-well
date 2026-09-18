import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on Stays home. Reserved at the real sizes: the headline and its
 * line, the search card with its two rows, the six doors, then the first row
 * of stay cards. The rise runs in the incoming flip's direction, so loading
 * continues the flip's story rather than interrupting it.
 */
export default function LoadingStays() {
  return (
    <LoadingShell label="Loading stays">
      <section>
        <Skeleton width="14rem" height="2rem" radius="sm" />
        <Skeleton className="mt-xs" width="24rem" height="1rem" radius="sm" />
        <div className="mt-block flex flex-col gap-inline">
          <Skeleton height="3rem" radius="lg" />
          <Skeleton height="3.5rem" radius="lg" />
          <Skeleton height="3rem" radius="pill" />
        </div>
      </section>
      <div className="mt-section-tight grid grid-cols-3 gap-md lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height="6.5rem" radius="lg" className={i > 2 ? "hidden lg:block" : ""} />
        ))}
      </div>
      <div className="mt-section-tight">
        <Skeleton width="14rem" height="1.5rem" radius="sm" />
        <ul className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
