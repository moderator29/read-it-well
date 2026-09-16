import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on Personal Mode home.
 *
 * The `(app)` layout owns the rail, the tab bar and the top bar, so they are
 * already on screen when this renders: only the page's own content is
 * outstanding, which is why there is no chrome here.
 *
 * Home awaits the recommended listings before it can render its greeting, so
 * the whole screen - including the text above the fold - waits on a database
 * round trip. The greeting block, the category rail and the first row of cards
 * are all reserved at their real sizes, and the cards use `SkeletonCard`, whose
 * proportions are `ListingCard`'s own.
 */
export default function LoadingHome() {
  return (
    <LoadingShell label="Loading your home screen">
      <section>
        <Skeleton width="16rem" height="2rem" radius="sm" />
        <Skeleton className="mt-xs" width="22rem" height="1rem" radius="sm" />
        {/* The search row: field plus its submit, at the real 48px. */}
        <div className="mt-md flex max-w-2xl items-center gap-xs sm:mt-lg">
          <Skeleton height="3rem" radius="lg" />
          <Skeleton width="6rem" height="3rem" radius="pill" className="shrink-0" />
        </div>
      </section>

      {/* The category rail: five tiles that scroll on phones and grid from sm. */}
      <div className="mt-xl grid grid-cols-3 gap-md sm:mt-2xl lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height="6.5rem" radius="lg" className={i > 2 ? "hidden lg:block" : ""} />
        ))}
      </div>

      <div className="mt-xl sm:mt-2xl">
        <Skeleton width="12rem" height="1.5rem" radius="sm" />
        <ul className="mt-md grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      </div>
    </LoadingShell>
  );
}
