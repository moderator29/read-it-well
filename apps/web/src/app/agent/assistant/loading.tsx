import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on the workspace assistant (R3-17: one of the four agent screens
 * that waited on the generic rows in `app/agent/loading.tsx`).
 *
 * An immersive page: no inner navigation, a one-line context with the history
 * and settings controls at the top, the empty conversation, the row of
 * starting questions and the composer pinned to the foot. Rows of cards were
 * the wrong shape for a screen that is mostly an empty thread.
 */
export default function LoadingAgentAssistant() {
  return (
    <AgentScreenSkeleton label="Loading the assistant" inner={false}>
      {/* The page's height under the bar and the content padding, so the composer
          sits at the foot where the real one is pinned. */}
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col">
        <div className="flex items-start justify-between gap-md border-b border-[var(--nf-border-subtle)] pb-sm">
          <div className="min-w-0 flex-1">
            <Skeleton width="80%" height="0.875rem" radius="sm" />
            <Skeleton className="mt-2xs" width="45%" height="0.875rem" radius="sm" />
          </div>
          <div className="flex shrink-0 gap-xs">
            <Skeleton circle width="2.75rem" />
            <Skeleton circle width="2.75rem" />
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex gap-xs overflow-hidden">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="15rem" height="3.25rem" radius="md" className="shrink-0" />
          ))}
        </div>
        <div className="mt-sm flex items-center gap-xs">
          <Skeleton height="3.5rem" radius="md" className="min-w-0 flex-1" />
          <Skeleton circle width="3.5rem" className="shrink-0" />
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
