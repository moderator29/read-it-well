import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your analytics.
 *
 * Panels of figures. Each one is a caption over a number over a line of context, which is three bars and not one.
 */
export default function LoadingAgentAnalytics() {
  return (
    <AgentScreenSkeleton label="Loading your analytics">
      <AgentTitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="35%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="55%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2" width="72%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
