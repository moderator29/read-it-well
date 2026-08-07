import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your reviews.
 *
 * A review is a heading, a body of two or three lines and a reply beneath it, and the body is what sets the card height.
 */
export default function LoadingAgentReviews() {
  return (
    <AgentScreenSkeleton label="Loading your reviews">
      <AgentTitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="38%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="92%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2" width="70%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
