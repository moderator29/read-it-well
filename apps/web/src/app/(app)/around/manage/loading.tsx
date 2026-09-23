import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your places.
 *
 * The places somebody has joined, read before render, each one a row with a state beside it.
 */
export default function LoadingAroundManage() {
  return (
    <LoadingShell label="Loading your places" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-sm">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-panel nf-panel--card block p-md">
            <Skeleton width="44%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-xs" width="60%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
