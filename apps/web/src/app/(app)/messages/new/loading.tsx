import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on a new message.
 *
 * The listing this message is about is read first, and it sits above the composer as a card. Reserving it stops the composer starting high and dropping.
 */
export default function LoadingNewMessage() {
  return (
    <LoadingShell label="Loading a new message" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="50%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="78%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
