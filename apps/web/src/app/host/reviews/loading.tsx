import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Skeleton } from "@/components/ui/Skeleton";
import { LargeHeaderSkeleton, SummaryCardSkeleton } from "@/components/app/ScreenSkeleton";
import { HostScreenSkeleton } from "@/components/host/HostScreenSkeleton";
import "../host-desk.css";

/**
 * The wait, on the host's reviews.
 *
 * `HostReviewsView`: the large title and its count, the rating summary card,
 * then the review cards in `nf-hreview-grid` (one column, two from 1024px).
 * Each card is the stars, a name and date line, and a few lines of prose.
 */
export default async function LoadingHostReviews() {
  return (
    <HostScreenSkeleton label={getDictionary(await getLocale()).hostWorkspace.loadingScreens.reviews} wide>
      <LargeHeaderSkeleton />
      <div className="mt-md grid gap-md" aria-hidden="true">
        <SummaryCardSkeleton />
        <div className="nf-hreview-grid">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="nf-hreview">
              <div className="flex items-center gap-sm">
                <Skeleton circle width="2.5rem" className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton width="45%" height="0.9375rem" radius="sm" />
                  <Skeleton className="mt-2xs" width="30%" height="0.75rem" radius="sm" />
                </div>
              </div>
              <Skeleton width="6rem" height="1rem" radius="sm" />
              <Skeleton height="0.875rem" radius="sm" />
              <Skeleton width="70%" height="0.875rem" radius="sm" />
            </div>
          ))}
        </div>
      </div>
    </HostScreenSkeleton>
  );
}
