import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your page.
 *
 * A cover, an avatar and the fields under them. The cover is the tallest thing on the screen and sets where everything else begins.
 */
export default function LoadingProfileEdit() {
  return (
    <LoadingShell label="Loading your page" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="nf-card p-lg">
        <Skeleton width="40%" height="0.8125rem" radius="sm" />
        <Skeleton className="mt-sm" height="2.25rem" radius="sm" />
        <Skeleton className="mt-md" height="3.5rem" radius="lg" />
      </div>
      <div className="space-y-sm">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-card p-md">
            <Skeleton width="38%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-xs" width="72%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
