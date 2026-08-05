import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on incoming bookings.
 *
 * The screen an agent checks most often and the one where the wait is worst
 * understood: a blank column looks exactly like "no new bookings", which is the
 * single most expensive wrong impression this product can give a host.
 *
 * The tab strip is drawn at its real 44px so the list below it does not jump
 * once the counts resolve.
 */
export default function LoadingAgentBookings() {
  return (
    <AgentScreenSkeleton label="Loading your bookings">
      <AgentTitleSkeleton />

      <Skeleton className="mb-4" width="18rem" height="2.75rem" radius="pill" />

      <ul className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="nf-card overflow-hidden p-0">
            <div className="p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Skeleton width="40%" height="0.9375rem" radius="sm" />
                  <Skeleton className="mt-2" width="65%" height="0.8125rem" radius="sm" />
                </div>
                <Skeleton width="5rem" height="1.25rem" radius="pill" className="shrink-0" />
              </div>
              {/* The dates row and the accept / decline pair beneath it. */}
              <Skeleton className="mt-3" width="55%" height="0.8125rem" radius="sm" />
              <div className="mt-4 flex gap-3">
                <Skeleton height="2.75rem" radius="pill" />
                <Skeleton height="2.75rem" radius="pill" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AgentScreenSkeleton>
  );
}
