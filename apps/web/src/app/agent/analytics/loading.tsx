import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The wait, on your analytics.
 *
 * Drawn at the real screen's proportions rather than as four identical cards,
 * which is what stood here while the route was a stub. The tile row, the chart
 * block and the two panels below it are all reserved at the sizes the finished
 * page uses, so the first figure to land does so in the box already waiting for
 * it instead of shoving the rest of the page down the screen.
 *
 * The chart block matters most for that. It is the tallest thing on the page by
 * some distance, and a skeleton that ignored it would let every panel beneath
 * jump a hundred and fifty pixels the moment the ledger answered.
 */
export default function LoadingAgentAnalytics() {
  return (
    <AgentScreenSkeleton label="Loading your analytics">
      <AgentTitleSkeleton />

      <div className="space-y-6">
        {/* Four headline tiles, at the tile's own rhythm. */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="nf-card flex flex-col gap-2 p-3.5 sm:gap-2.5 sm:p-4">
              <Skeleton width="2.25rem" height="2.25rem" radius="md" className="sm:hidden" />
              <Skeleton width="2.5rem" height="2.5rem" radius="md" className="hidden sm:block" />
              <Skeleton width="75%" height="0.75rem" radius="sm" />
              <Skeleton width="55%" height="1.25rem" radius="sm" />
            </div>
          ))}
        </div>

        {/* The settled trend. One heading, one line of context, one plot. */}
        <div className="nf-card p-4 sm:p-5">
          <Skeleton width="11rem" height="1.125rem" radius="sm" />
          <Skeleton className="mt-2" width="80%" height="0.8125rem" radius="sm" />
          <Skeleton className="mt-4" height="9rem" radius="md" />
        </div>

        {/* Requests, then the calendar, then the property table. */}
        {[5, 4, 6].map((rows, i) => (
          <div key={i} className="nf-card p-4 sm:p-5">
            <Skeleton width="9rem" height="1.125rem" radius="sm" />
            <Skeleton className="mt-2" width="65%" height="0.8125rem" radius="sm" />
            <div className="mt-4 space-y-2.5">
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
