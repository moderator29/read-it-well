import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait on stay search: header, the search card, a chip row, then cards. */
export default function LoadingStaysSearch() {
  return (
    <LoadingShell label="Loading stays" className="mx-auto max-w-5xl">
      <PageHeaderSkeleton subtitle />
      <div className="flex flex-col gap-inline">
        <Skeleton height="3rem" radius="lg" />
        <Skeleton height="3.5rem" radius="lg" />
        <Skeleton height="3rem" radius="pill" />
      </div>
      <div className="mt-block flex gap-xs">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width="5.5rem" height="2.75rem" radius="pill" />
        ))}
      </div>
      <ul className="mt-block grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
