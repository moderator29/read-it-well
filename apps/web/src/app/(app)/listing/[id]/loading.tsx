import { Skeleton } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on a listing.
 *
 * This is the screen that sells the product, and the one users arrive at from a
 * shared link on a cold cache. It awaits the listing, its photographs, its
 * saved state and its reviews.
 *
 * Two measurements matter more than the rest and both are reproduced exactly:
 * the gallery's aspect ratio, which changes at every breakpoint (4:5 on phones,
 * 16:9 from sm, 2:1 from lg), and the content sheet that rides UP over the media
 * on a large top radius. Get either wrong and the photograph lands at a
 * different height than the placeholder, pushing the price - the single most
 * important figure on the page - down the screen as the user is reaching for it.
 */
export default function LoadingListing() {
  return (
    <LoadingShell label="Loading this place" className="mx-auto w-full max-w-5xl">
      <div className="relative -mx-5 -mt-8 sm:-mt-10 md:-mx-8">
        <Skeleton
          radius="none"
          className="aspect-[4/5] w-full sm:aspect-[16/9] lg:aspect-[2/1]"
        />
      </div>

      <div className="nf-glass nf-glass--strong relative z-10 -mx-5 -mt-8 rounded-t-[1.75rem] border-x-0 border-b-0 px-5 pb-6 pt-6 sm:-mt-10 sm:rounded-t-[2.25rem] sm:px-6 sm:pb-8 sm:pt-8 md:-mx-8 md:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="min-w-0">
            {/* Status row, title, location, then the hero price. */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton width="5.5rem" height="1.375rem" radius="pill" />
              <Skeleton width="4.5rem" height="1.375rem" radius="pill" />
            </div>
            <Skeleton className="mt-3" width="80%" height="2.25rem" radius="sm" />
            <Skeleton className="mt-2.5" width="45%" height="1rem" radius="sm" />
            <Skeleton className="mt-4" width="12rem" height="3rem" radius="sm" />

            <div className="mt-6 space-y-2.5">
              <Skeleton height="0.875rem" radius="sm" />
              <Skeleton height="0.875rem" radius="sm" />
              <Skeleton width="72%" height="0.875rem" radius="sm" />
            </div>

            {/* The amenity grid. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height="2.75rem" radius="md" />
              ))}
            </div>
          </div>

          {/* The reserve panel, pinned beside the content from lg up. */}
          <aside className="nf-card p-5">
            <Skeleton width="60%" height="1.5rem" radius="sm" />
            <Skeleton className="mt-4" height="3rem" radius="lg" />
            <Skeleton className="mt-3" height="3rem" radius="lg" />
            <Skeleton className="mt-5" height="3.5rem" radius="pill" />
            <Skeleton className="mt-4" width="70%" height="0.8125rem" radius="sm" />
          </aside>
        </div>
      </div>
    </LoadingShell>
  );
}
