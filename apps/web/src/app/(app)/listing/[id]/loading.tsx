import { Skeleton } from "@/components/ui/Skeleton";
import { panelClass } from "@/components/ui/Panel";
import { LoadingShell } from "@/components/app/ScreenSkeleton";
import { ListingHandoffShell } from "@/components/app/listing/ListingHandoffShell";

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
  /* B4: a tap from a card paints the card's own facts in one frame
     (ListingHandoffShell); a cold open keeps this skeleton. */
  return (
    <LoadingShell label="Loading this place" className="mx-auto w-full max-w-5xl">
      <ListingHandoffShell verifiedLabel="Verified" fallback={<ListingSkeleton />} />
    </LoadingShell>
  );
}

function ListingSkeleton() {
  return (
    <>
      <div className="relative -mx-gutter -mt-xl sm:-mt-2xl">
        <Skeleton
          radius="none"
          className="aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[2/1]"
        />
      </div>

      <div className={panelClass({ variant: "card", className: "relative z-10 -mt-xl sm:-mt-2xl sm:p-xl" })}>
        <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="min-w-0">
            {/* Status row, title, location, then the hero price. */}
            <div className="flex flex-wrap items-center gap-xs">
              <Skeleton width="5.5rem" height="1.375rem" radius="sm" />
              <Skeleton width="4.5rem" height="1.375rem" radius="sm" />
            </div>
            <Skeleton className="mt-sm" width="80%" height="2.25rem" radius="sm" />
            <Skeleton className="mt-xs" width="45%" height="1rem" radius="sm" />
            <Skeleton className="mt-md" width="12rem" height="3rem" radius="sm" />

            <div className="mt-lg space-y-xs">
              <Skeleton height="0.875rem" radius="sm" />
              <Skeleton height="0.875rem" radius="sm" />
              <Skeleton width="72%" height="0.875rem" radius="sm" />
            </div>

            {/* The amenity grid. */}
            <div className="mt-lg grid grid-cols-2 gap-sm sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} height="2.75rem" radius="sm" />
              ))}
            </div>
          </div>

          {/* The reserve panel, pinned beside the content from lg up. */}
          <aside className={panelClass({ className: "p-lg" })}>
            <Skeleton width="60%" height="1.5rem" radius="sm" />
            <Skeleton className="mt-md" height="3rem" radius="sm" />
            <Skeleton className="mt-sm" height="3rem" radius="sm" />
            <Skeleton className="mt-md" height="3.5rem" radius="sm" />
            <Skeleton className="mt-md" width="70%" height="0.8125rem" radius="sm" />
          </aside>
        </div>
      </div>
    </>
  );
}
