import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/** The wait, on a coin: the header, the identity row, the price, the chart. */
export default function LoadingCoin() {
  return (
    <LoadingShell label="Loading market prices" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="flex items-center gap-row">
        <Skeleton width="3.5rem" height="3.5rem" radius="pill" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton width="40%" height="1.25rem" radius="sm" />
          <Skeleton className="mt-inline-tight" width="20%" height="0.8125rem" radius="sm" />
        </div>
      </div>
      <Skeleton className="mt-group" width="60%" height="2.5rem" radius="sm" />
      <Skeleton className="mt-group" height="11rem" radius="xl" />
    </LoadingShell>
  );
}
