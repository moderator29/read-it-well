import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on an invite door. The door page's own column: the logo, then
 * the Island's outline holding the gift (88px), the title and its line and
 * the two full-width doors (rounded rectangles at radius 14, D2, so the
 * shape does not change when they arrive), then the caption under it. It
 * holds still: the arriving Island is the one thing that moves.
 */
export default function LoadingJoin() {
  return (
    <main id="main" className="nf-shell nf-join">
      <LoadingShell label="Loading your invite" className="nf-door-page">
        <Skeleton width="7.5rem" height="2.5rem" radius="md" />
        <div className="nf-island grid gap-md justify-self-stretch p-md" aria-hidden="true">
          <Skeleton circle width="5.5rem" />
          <Skeleton width="70%" height="1.75rem" radius="sm" />
          <Skeleton width="85%" height="1rem" radius="sm" />
          <div className="nf-door-page__actions">
            <Skeleton height="3.25rem" radius="md" />
            <Skeleton height="3.25rem" radius="md" />
          </div>
        </div>
        <Skeleton width="55%" height="0.75rem" radius="sm" />
      </LoadingShell>
    </main>
  );
}
