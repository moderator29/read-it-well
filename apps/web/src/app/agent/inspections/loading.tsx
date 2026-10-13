import "@/app/css/visit-calendar.css";
import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on the agent's inspections (R3-17: one of the four agent screens
 * that waited on the generic rows in `app/agent/loading.tsx`).
 *
 * In the page's own order and containers (`VisitCalendar`): the inspection
 * hero, then the three figures, the calendar card (its head, the seven day
 * strip and a day's rows) and, beside it from 1024px, the viewing windows and
 * the day's route. Same classes as the page, so nothing moves when it lands.
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

        <div className="nf-vcal">
          <div className="nf-vcal__main">
            <div className="nf-vcal-sum">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="4.5rem" radius="md" />
              ))}
            </div>
            <div className="nf-vcal-card">
              <Skeleton width="45%" height="1.25rem" radius="sm" />
              <Skeleton className="mt-xs" width="30%" height="0.875rem" radius="sm" />
              <div className="nf-vcal-strip mt-group">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} height="4rem" radius="md" />
                ))}
              </div>
              <div className="nf-vcal-rows mt-group">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height="3.25rem" radius="md" />
                ))}
              </div>
            </div>
          </div>
          <div className="nf-vcal__aside">
            {[0, 1].map((i) => (
              <div key={i} className="nf-panel nf-panel--card p-card-sm">
                <Skeleton width="55%" height="1.25rem" radius="sm" />
                <Skeleton className="mt-sm" width="92%" height="0.875rem" radius="sm" />
                <Skeleton className="mt-2xs" width="70%" height="0.875rem" radius="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
