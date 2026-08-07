import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on this conversation.
 *
 * A thread alternates sides, so the placeholder does too: a wall of identical bars reads as a list and this is not a list.
 */
export default function LoadingThread() {
  return (
    <LoadingShell label="Loading this conversation" className="mx-auto w-full max-w-3xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="62%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="44%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
