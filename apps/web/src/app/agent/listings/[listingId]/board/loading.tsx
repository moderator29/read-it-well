import { Skeleton } from "@/components/ui/Skeleton";
import { AgentScreenSkeleton } from "@/components/agent/AgentScreenSkeleton";

/**
 * The wait, on a listing's board.
 *
 * `BoardPrint`'s column (`max-w-md`, `py-lg`): the title and its line, the
 * board preview (a tall bordered card holding the banner, the shape, the
 * code), the line about phones, then the two full-width pills with a caption
 * under each.
 */
export default function LoadingListingBoard() {
  return (
    <AgentScreenSkeleton label="Loading the board">
      <div className="mx-auto max-w-md py-lg">
        <Skeleton width="10rem" height="1.75rem" radius="sm" />
        <Skeleton className="mt-inline" width="85%" height="0.875rem" radius="sm" />
        <Skeleton className="mt-group" height="17rem" radius="md" />
        <Skeleton className="mt-group" width="75%" height="0.875rem" radius="sm" />
        <div className="mt-group flex flex-col gap-row">
          <Skeleton height="3rem" radius="pill" />
          <Skeleton width="70%" height="0.75rem" radius="sm" />
          <Skeleton height="3rem" radius="pill" />
          <Skeleton width="60%" height="0.75rem" radius="sm" />
        </div>
      </div>
    </AgentScreenSkeleton>
  );
}
