import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the assistant.
 *
 * The thread is read before the composer can be trusted to send into it. The composer is pinned to the bottom edge on this route, so the placeholder reserves the thread and lets the composer sit where it always sits.
 */
export default function LoadingAssistant() {
  return (
    <LoadingShell label="Loading the assistant" className="mx-auto w-full max-w-3xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="55%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="82%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
