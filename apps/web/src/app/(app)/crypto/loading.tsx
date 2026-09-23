import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait on `/crypto`, which is dark for version one (`page.tsx`:
 * `notFound()`). What follows this wait is the
 * platform's not-found page, so the wait draws a header and one plain panel
 * and nothing that looks like a market: no coin rail, no price tiles, nothing
 * we do not offer (orphans sweep, 23 September). The market's own skeleton is
 * in git at d6748e6e and comes back with the route.
 */
export default function LoadingCrypto() {
  return (
    <LoadingShell label="Loading" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="nf-panel nf-panel--card block p-card-sm">
        <Skeleton width="60%" height="1.25rem" radius="sm" />
        <Skeleton className="mt-row" width="85%" height="0.875rem" radius="sm" />
      </div>
    </LoadingShell>
  );
}
