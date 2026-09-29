import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on a conversation opened in the agent workspace.
 *
 * Without this the inbox's own skeleton (the parent segment's) stood in for a
 * thread. Bubbles alternate sides, as the consumer thread's wait does.
 */
export default function LoadingAgentThread() {
  return (
    <AgentScreenSkeleton label="Loading this conversation">
      <div className="mx-auto w-full max-w-3xl space-y-sm">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <div className="nf-panel nf-panel--card w-[70%] p-md">
              <Skeleton width="62%" height="1.0625rem" radius="sm" />
              <Skeleton className="mt-xs" width="44%" height="0.875rem" radius="sm" />
            </div>
          </div>
        ))}
      </div>
    </AgentScreenSkeleton>
  );
}
