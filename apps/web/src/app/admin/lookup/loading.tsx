import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on the lookup: the heading, the one box and its button, then the results panel. It fell back to the overview's strip and cards before. */
export default function LoadingLookup() {
  return (
    <LoadingShell label="Loading the lookup" className="nf-admin-stack">
      <Skeleton width="10rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      <Skeleton width="100%" height="3rem" radius="md" />
      <Skeleton width="100%" height="8rem" radius="lg" />
    </LoadingShell>
  );
}
