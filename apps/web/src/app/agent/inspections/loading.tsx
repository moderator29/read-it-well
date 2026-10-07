import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on the agent's inspections (R3-17: one of the four agent screens
 * that waited on the generic rows in `app/agent/loading.tsx`).
 *
 * In the page's own order: the inspection hero (a two-word title and its
 * line, the house in the top right corner), the day's route and the viewing
 * windows as two cards, then the section head and the inspection cards (a
 * photo beside a status chip and a title). Same containers as the page, so
 * nothing moves when it lands.
 */
export default function LoadingAgentInspections() {
  return (
    <AgentScreenSkeleton label="Loading your inspections">
      <div className="nf-console">
        <div className="mb-sm mt-sm flex items-start justify-between gap-md">
          <div className="min-w-0 flex-1">
            <Skeleton width="13rem" height="1.75rem" radius="sm" />
            <Skeleton className="mt-xs" width="85%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" width="60%" height="0.875rem" radius="sm" />
          </div>
          <Skeleton width="5.75rem" height="4.375rem" radius="md" className="shrink-0" />
        </div>

        {/* The day's route, then the viewing windows. */}
        {[0, 1].map((i) => (
          <div key={i} className="nf-panel nf-panel--card mt-lg p-card-sm">
            <Skeleton width="55%" height="1.25rem" radius="sm" />
            <Skeleton className="mt-sm" width="92%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" width="70%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-md" width="65%" height="0.875rem" radius="sm" />
          </div>
        ))}

        <div className="mt-lg">
          <Skeleton width="11rem" height="1.375rem" radius="sm" />
          <Skeleton className="mt-xs" width="75%" height="0.9375rem" radius="sm" />
          <div className="mt-md space-y-sm">
            {[0, 1].map((i) => (
              <div key={i} className="nf-panel nf-panel--card p-sm">
                <div className="flex items-center gap-sm">
                  <Skeleton width="5.5rem" height="3.75rem" radius="sm" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Skeleton width="5rem" height="1.125rem" radius="xs" />
                    <Skeleton className="mt-xs" width="70%" height="1rem" radius="sm" />
                  </div>
                  <Skeleton width="1rem" height="1rem" radius="xs" className="shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
