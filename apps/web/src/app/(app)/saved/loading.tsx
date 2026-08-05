import { SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell, PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on the saved board.
 *
 * Saved reads the viewer's own entries and then hydrates each one into a full
 * `ListingCard`, so the wait scales with how much a user has saved - the more
 * invested they are, the longer they stare at nothing.
 *
 * Two columns at `max-w-3xl`, matching the board, and the cards are
 * `SkeletonCard`, which is `ListingCard`'s own geometry.
 */
export default function LoadingSaved() {
  return (
    <LoadingShell label="Loading your saved places" className="mx-auto w-full max-w-3xl">
      <PageHeaderSkeleton />

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
