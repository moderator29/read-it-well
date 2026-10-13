import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on team oversight: the heading, then the backlog's seven queues and the staff table. It fell back to the overview's strip and cards before. */
export default function LoadingOversight() {
  return (
    <LoadingShell label="Loading team oversight" className="nf-admin-stack">
      <Skeleton width="12rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} width="100%" height="2.5rem" radius="sm" />
      ))}
      <Skeleton width="100%" height="8rem" radius="lg" />
    </LoadingShell>
  );
}
