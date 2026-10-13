import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on people: the heading, the search card, then the list of members. It fell back to the overview's strip and cards before. */
export default function LoadingPeople() {
  return (
    <LoadingShell label="Loading people" className="nf-admin-stack">
      <Skeleton width="8rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      <Skeleton width="100%" height="8rem" radius="lg" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} width="100%" height="2.75rem" radius="sm" />
      ))}
    </LoadingShell>
  );
}
