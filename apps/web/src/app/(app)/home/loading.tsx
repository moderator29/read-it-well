import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on home.
 *
 * The `(app)` layout owns the rail, the tab bar and the top bar, so they are
 * already on screen when this renders: only the page's own content is
 * outstanding, which is why there is no chrome here.
 *
 * Home awaits the recommended listings before it can render its greeting, so
 * the whole screen waits on a database round trip. The shapes reserved are
 * the screen's own, in its order: the greeting, the location chip, the
 * search field with the filter beside it, the four tiles, then the first
 * card at `ListingCard`'s proportions. A skeleton that does not match its
 * screen teaches the eye the wrong shape and then corrects it.
 */
export default function LoadingHome() {
  return (
    <LoadingShell label="Loading your home screen">
      <section>
        <Skeleton width="7rem" height="1rem" radius="sm" />
        <Skeleton className="mt-inline-tight" width="10rem" height="2.25rem" radius="sm" />
        <Skeleton className="mt-md" height="3.25rem" radius="lg" />
        <div className="mt-md flex items-center gap-inline">
          <Skeleton height="3.5rem" radius="lg" />
          <Skeleton width="3.25rem" height="3.25rem" radius="md" className="shrink-0" />
        </div>
      </section>

      <div className="nf-home__tiles mt-md">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height="4.75rem" radius="lg" />
        ))}
      </div>

      <div className="mt-section-tight">
        <Skeleton width="13rem" height="1.5rem" radius="sm" />
        <ul className="nf-home__cards mt-heading">
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
