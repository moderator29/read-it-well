import { SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait on restaurant discovery: header, then the grid at card size. */
export default function LoadingRestaurants() {
  return (
    <LoadingShell label="Loading restaurants" className="mx-auto max-w-5xl">
      <PageHeaderSkeleton subtitle />
      <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
