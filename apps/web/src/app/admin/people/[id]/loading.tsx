import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on a person file: the name, who they are, then the file's sections. It fell back to the overview's strip and cards before. */
export default function LoadingPersonFile() {
  return (
    <LoadingShell label="Loading the person file" className="nf-admin-stack">
      <Skeleton width="12rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      <Skeleton width="100%" height="9rem" radius="lg" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} width="100%" height="5rem" radius="lg" />
      ))}
    </LoadingShell>
  );
}
