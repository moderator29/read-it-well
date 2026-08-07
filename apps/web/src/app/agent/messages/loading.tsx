import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your messages.
 *
 * A conversation row is an avatar beside two lines, and the avatar sets the row height exactly as it does in the guest inbox.
 */
export default function LoadingAgentMessages() {
  return (
    <AgentScreenSkeleton label="Loading your messages">
      <AgentTitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="42%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="85%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2" width="55%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
