import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your verification.
 *
 * A ladder of four rungs, each a card with a state and a next step, so the placeholder is four cards rather than a list of lines.
 */
export default function LoadingAgentVerification() {
  return (
    <AgentScreenSkeleton label="Loading your verification">
      <AgentTitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="45%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="80%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2" width="60%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
