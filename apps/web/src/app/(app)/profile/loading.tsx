import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your account.
 *
 * The name and the avatar are read before anything renders, so the identity block keeps its full height. A card that grows when a name arrives moves every row under it.
 */
export default function LoadingProfile() {
  return (
    <LoadingShell label="Loading your account" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="45%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="70%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
