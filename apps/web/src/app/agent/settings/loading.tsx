import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your settings.
 *
 * Grouped rows, each a label above a value, which is the one shape every account surface on this platform shares.
 */
export default function LoadingAgentSettings() {
  return (
    <AgentScreenSkeleton label="Loading your settings">
      <AgentTitleSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="40%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="62%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
