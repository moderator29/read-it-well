import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on inviting someone.
 *
 * The header with its line, the gift object (88px, centred), then the share
 * card: the link in a field, the code, and the share pills.
 */
export default function LoadingInviteSettings() {
  return (
    <LoadingShell label="Loading your invite" className="mx-auto w-full max-w-2xl">
      <PageHeaderSkeleton subtitle />
      <Skeleton circle width="5.5rem" className="mx-auto mb-block" />
      <div aria-hidden="true" className="nf-panel nf-panel--card block p-md">
        <Skeleton width="40%" height="0.875rem" radius="sm" />
        <Skeleton className="mt-xs" height="3.25rem" radius="lg" />
        <Skeleton className="mt-md" width="30%" height="1.5rem" radius="sm" />
        <div className="mt-md grid gap-sm sm:grid-cols-2">
          <Skeleton height="3rem" radius="pill" />
          <Skeleton height="3rem" radius="pill" />
        </div>
      </div>
    </LoadingShell>
  );
}
