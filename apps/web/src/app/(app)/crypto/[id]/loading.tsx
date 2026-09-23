import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait on `/crypto/[id]`, dark with `/crypto` (see `../loading.tsx`): a
 * header and one plain panel, no coin identity, price or chart, because the
 * page that follows is the not-found page. The coin's own skeleton is in git
 * at d6748e6e and comes back with the route.
 */
export default function LoadingCoin() {
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
