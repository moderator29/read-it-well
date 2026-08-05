import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on the agent's own listings.
 *
 * The workspace groups listings by status and each row carries a square thumb at
 * 5.25rem beside its text. The thumb is the load-bearing measurement here: it
 * sets the row height, so a placeholder that got it wrong would shift the whole
 * list vertically the moment the photographs arrived.
 */
export default function LoadingAgentListings() {
  return (
    <AgentScreenSkeleton label="Loading your listings">
      <AgentTitleSkeleton />

      {/* The status filter rail above the list. */}
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width="6rem" height="2.75rem" radius="pill" />
        ))}
      </div>

      <ul className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="nf-card overflow-hidden p-0">
            <div className="flex gap-4 p-3.5">
              <Skeleton width="5.25rem" height="5.25rem" radius="md" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton width="4.5rem" height="1.25rem" radius="pill" />
                <Skeleton className="mt-2" width="70%" height="1rem" radius="sm" />
                <Skeleton className="mt-2" width="45%" height="0.8125rem" radius="sm" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AgentScreenSkeleton>
  );
}
