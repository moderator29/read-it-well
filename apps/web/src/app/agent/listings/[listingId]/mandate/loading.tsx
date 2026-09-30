import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on a listing's mandate.
 *
 * The page's column (`max-w-md`, `gap-group`, `py-lg`): the title and its two
 * lines, a status line, then the mandate form (the principal's name, the
 * dates, the document) and its pill.
 */
export default function LoadingListingMandate() {
  return (
    <AgentScreenSkeleton label="Loading the mandate">
      <div className="mx-auto flex max-w-md flex-col gap-group py-lg">
        <div>
          <Skeleton width="11rem" height="1.75rem" radius="sm" />
          <Skeleton className="mt-inline" width="90%" height="0.875rem" radius="sm" />
          <Skeleton className="mt-inline" width="70%" height="0.875rem" radius="sm" />
        </div>
        <Skeleton width="80%" height="0.875rem" radius="sm" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <Skeleton width="8rem" height="0.875rem" radius="sm" />
            <Skeleton className="mt-xs" height="3.25rem" radius="lg" />
          </div>
        ))}
        <Skeleton height="3rem" radius="pill" />
      </div>
    </AgentScreenSkeleton>
  );
}
