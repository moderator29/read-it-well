import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on your settings.
 *
 * Grouped rows, each a label above a value. The group is the unit that must not move, because a settings list is scanned rather than read.
 */
export default function LoadingSettings() {
  return (
    <LoadingShell label="Loading your settings" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="nf-card p-4">
            <Skeleton width="42%" height="1.0625rem" radius="sm" />
            <Skeleton className="mt-2.5" width="62%" height="0.875rem" radius="sm" />
          </div>
        ))}
      </div>
    </LoadingShell>
  );
}
