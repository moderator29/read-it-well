import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on what you are here for.
 *
 * Nine choices in a grid. The grid is reserved at its real height so the Save bar underneath does not travel up the screen as the tiles land.
 */
export default function LoadingInterests() {
  return (
    <LoadingShell label="Loading what you are here for" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="38%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="88%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
