import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton, AgentTitleSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on a listing's calendar.
 *
 * A month grid is six rows of seven, and it is the one placeholder on this
 * platform where the shape matters more than the content: an agent opens this
 * to close a night, and a grid that arrives a different size from the one that
 * was drawn moves the night they were reaching for.
 */
export default function LoadingCalendar() {
  return (
    <AgentScreenSkeleton label="Loading the calendar">
      <AgentTitleSkeleton />
      <div className="nf-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton width="9rem" height="1.25rem" radius="sm" />
          <Skeleton width="6rem" height="2.75rem" radius="pill" />
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 42 }, (_, i) => (
            <Skeleton key={i} height="2.75rem" radius="md" />
          ))}
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
