import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on the front door desk: a heading, the funnel's seven steps, then the two short lists. It fell back to the overview's strip and cards before. */
export default function LoadingFrontDoor() {
  return (
    <LoadingShell label="Loading the front door" className="nf-admin-stack">
      <Skeleton width="12rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} width="100%" height="2.5rem" radius="sm" />
      ))}
      <Skeleton width="100%" height="6rem" radius="md" />
      <Skeleton width="100%" height="5rem" radius="md" />
    </LoadingShell>
  );
}
