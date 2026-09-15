import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, at the root, and therefore the platform's floor.
 *
 * It is here for the landing page above all. `/` is the one route with no
 * segment of its own to hang a boundary on, and it is the most expensive page
 * on the platform to render - it awaits `getPlatformStats`, the featured
 * carousel and the reviews band before it produces a single pixel. It was also
 * the only page on the platform a stranger ever sees first, and it had no
 * loading state at all: a tap on a link to Vallo left the previous site on
 * screen for the whole round trip.
 *
 * As a ROOT boundary it is also the fallback for any segment that has not got a
 * closer one, which is the second reason to have it. A nested `loading.tsx`
 * always wins for its own subtree, so `(app)`, `(auth)` and `(site)` keep the
 * skeletons that mirror their screens and nothing here overrides them.
 *
 * It draws the landing hero's shape rather than a spinner: a headline block, a
 * paragraph, the search bar at its real 48px, and the four feature cards. A
 * centred spinner says only that something is happening and then moves
 * everything when it stops.
 */
export default function LoadingRoot() {
  return (
    <LoadingShell label="Loading Vallo" className="nf-shell py-14 sm:py-20">
      <div className="max-w-2xl">
        {/* Three display lines, which is what the hero is. */}
        <Skeleton width="min(18rem, 80%)" height="3.25rem" radius="sm" />
        <Skeleton width="min(20rem, 88%)" height="3.25rem" radius="sm" className="mt-3" />
        <Skeleton width="min(16rem, 72%)" height="3.25rem" radius="sm" className="mt-3" />

        <Skeleton width="min(34rem, 100%)" height="1.25rem" radius="sm" className="mt-6" />

        {/* The search row: field plus its submit, at the real 48px. */}
        <div className="mt-8 flex items-center gap-2">
          <Skeleton height="3.5rem" radius="xl" />
          <Skeleton width="7rem" height="3.5rem" radius="pill" className="shrink-0" />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height="6rem" radius="xl" />
        ))}
      </div>
    </LoadingShell>
  );
}
