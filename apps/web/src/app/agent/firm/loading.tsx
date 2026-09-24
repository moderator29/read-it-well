import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait, on the firm desk: listings, team and the enquiry record, at their sizes. */
export default function LoadingFirmDesk() {
  return (
    <AgentScreenSkeleton label="Loading the firm desk">
      <AgentTitleSkeleton />
      <div className="space-y-lg">
        {[5, 3, 4].map((rows, i) => (
          <div key={i} className="nf-panel nf-panel--card block p-md sm:p-panel">
            <Skeleton width="9rem" height="1.125rem" radius="sm" />
            <div className="mt-md space-y-sm">
              {Array.from({ length: rows }, (_, row) => (
                <Skeleton key={row} height="1.5rem" radius="sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
