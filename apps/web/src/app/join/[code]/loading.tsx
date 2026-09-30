import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on an invite door. The door page's own column: the logo, the
 * gift (88px), the title and its line, then the two full-width pills and
 * the caption under them.
 */
export default function LoadingJoin() {
  return (
    <main id="main" className="nf-shell">
      <LoadingShell label="Loading your invite" className="nf-door-page">
        <Skeleton width="7.5rem" height="2.5rem" radius="md" />
        <Skeleton circle width="5.5rem" />
        <Skeleton width="70%" height="1.75rem" radius="sm" />
        <Skeleton width="85%" height="1rem" radius="sm" />
        <div className="nf-door-page__actions" aria-hidden="true">
          <Skeleton height="3.25rem" radius="pill" />
          <Skeleton height="3.25rem" radius="pill" />
        </div>
        <Skeleton width="55%" height="0.75rem" radius="sm" />
      </LoadingShell>
    </main>
  );
}
