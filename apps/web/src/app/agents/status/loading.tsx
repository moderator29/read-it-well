import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on an agent application's status.
 *
 * One card carrying a state, a reference and what happens next. It is read
 * before render because the answer depends on who is asking, and it is the
 * only thing on the screen, so it is reserved at its real height.
 */
export default function LoadingAgentStatus() {
  return (
    <LoadingShell label="Loading your application" className="mx-auto w-full max-w-xl py-10">
      <div className="nf-card p-6">
        <Skeleton width="7rem" height="1.75rem" radius="pill" />
        <Skeleton className="mt-4" width="60%" height="1.5rem" radius="sm" />
        <Skeleton className="mt-3" height="0.875rem" radius="sm" />
        <Skeleton className="mt-2" width="80%" height="0.875rem" radius="sm" />
        <Skeleton className="mt-6" height="3.5rem" radius="lg" />
      </div>
    </LoadingShell>
  );
}
