import { Skeleton } from "@/components/ui/Skeleton";
import { PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The shapes of the support screens while they load: rows for the inbox,
 * bubbles for a thread, fields for a new query.
 *
 * Bodies only. Each route's `loading.tsx` wraps its body in `LoadingShell`
 * itself, so the announcement goes through the State kit where the state
 * sweep (`scripts/design/state-sweep.mjs`) can see it.
 */

export function TicketListSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <ul className="nf-panel nf-panel--card block">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="nf-srow">
            <span className="nf-srow__body min-w-0">
              <Skeleton width="55%" height="1rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="85%" height="0.8125rem" radius="sm" />
              <Skeleton className="mt-inline-tight" width="40%" height="0.8125rem" radius="sm" />
            </span>
            <Skeleton width="4.5rem" height="1.5rem" radius="pill" className="shrink-0" />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ThreadSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-block">
        <Skeleton width="100%" height="5.5rem" radius="lg" />
        <div className="flex justify-end">
          <Skeleton width="70%" height="4rem" radius="xl" />
        </div>
        <div className="flex items-end gap-row">
          <Skeleton circle width="1.625rem" />
          <Skeleton width="65%" height="3.5rem" radius="xl" />
        </div>
        <Skeleton width="100%" height="8rem" radius="lg" />
      </div>
    </>
  );
}

export function NewQuerySkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="space-y-block">
        <Skeleton width="100%" height="2.75rem" radius="md" />
        <Skeleton width="100%" height="4.5rem" radius="lg" />
        <Skeleton width="100%" height="9rem" radius="lg" />
        <Skeleton width="100%" height="3.5rem" radius="md" />
      </div>
    </>
  );
}
