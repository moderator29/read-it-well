import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

/** The wait on the field speed desk: a heading, then the table's rows. */
export default function LoadingFieldSpeed() {
  return (
    <LoadingShell label="Loading field speed" className="nf-admin-stack">
      <Skeleton width="12rem" height="1.75rem" radius="sm" />
      <Skeleton width="80%" height="0.875rem" radius="sm" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} width="100%" height="2.5rem" radius="sm" />
      ))}
    </LoadingShell>
  );
}
