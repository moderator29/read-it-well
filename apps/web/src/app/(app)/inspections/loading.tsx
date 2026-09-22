import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on /inspections, in the geometry of the screen it stands in for
 * (F6A8A482): the back square, the two-line title block with the house at the
 * right, then the listing card, the three-cell facts row and the checklist
 * panel, each at the height the real one draws, so the first sheet lands
 * where its placeholder sat.
 */
export default function LoadingInspections() {
  return (
    <LoadingShell label="Loading your inspections" className="mx-auto w-full max-w-2xl">
      <Skeleton width="2.75rem" height="2.75rem" radius="md" />
      <div className="mt-md flex items-start gap-xs">
        <div className="min-w-0 flex-1">
          <Skeleton width="80%" height="1.75rem" radius="sm" />
          <Skeleton className="mt-xs" width="70%" height="1rem" radius="sm" />
          <Skeleton className="mt-2xs" width="45%" height="1rem" radius="sm" />
        </div>
        <Skeleton width="5.5rem" height="5.5rem" radius="lg" className="shrink-0" />
      </div>
      <Skeleton className="mt-md" width="100%" height="8.5rem" radius="md" />
      <Skeleton className="mt-sm" width="100%" height="5.25rem" radius="md" />
      <Skeleton className="mt-sm" width="100%" height="17rem" radius="md" />
    </LoadingShell>
  );
}
