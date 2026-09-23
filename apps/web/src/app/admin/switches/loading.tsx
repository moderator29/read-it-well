import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * Feature switches.
 *
 * The one console page whose rows are not a decision queue: each row is a
 * setting with a live toggle on the right, and it opens with a note card above
 * the list. Reusing the queue skeleton here would put two buttons where a single
 * switch goes and shift every row when the real list landed.
 */
export default function LoadingSwitches() {
  return (
    <LoadingShell label="Loading feature switches" className="nf-console w-full">
      <header className="mb-md">
        <Skeleton width="12rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-xs" width="90%" height="0.875rem" radius="sm" />
      </header>

      {/* The standing note about what a switch does. */}
      <div className="nf-panel nf-panel--card nf-admin-card mb-md flex gap-xs p-md">
        <Skeleton width="1.25rem" height="1.25rem" radius="sm" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton width="100%" height="0.8125rem" radius="sm" />
          <Skeleton className="mt-2xs" width="72%" height="0.8125rem" radius="sm" />
        </div>
      </div>

      <ul className="nf-queue-list">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="nf-panel nf-panel--card nf-admin-card flex flex-wrap items-start gap-md p-md sm:p-lg">
            <div className="min-w-0 flex-1">
              <Skeleton width="45%" height="1rem" radius="sm" />
              <Skeleton className="mt-xs" width="85%" height="0.8125rem" radius="sm" />
            </div>
            {/* The switch itself: 52×32, the geometry the real control paints. */}
            <Skeleton width="3.25rem" height="2rem" radius="pill" className="shrink-0" />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
