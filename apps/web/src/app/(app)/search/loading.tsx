import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait, on search results.
 *
 * Search is the route most likely to be entered repeatedly in a row - every
 * filter change and every sort is a new navigation and therefore a new wait -
 * so it is the one where a blank screen is felt most often.
 *
 * The sticky search bar keeps its full-bleed geometry (`-mx-5 -mt-4`, glass,
 * hairline) because it is the element the user's eye is already on: they just
 * typed into it. Reserving it means the query they typed reappears exactly where
 * they left it rather than half a bar lower.
 */
export default function LoadingSearch() {
  return (
    <LoadingShell label="Loading search results">
      <div className="nf-glass -mx-5 -mt-4 border-b border-[var(--nf-border-subtle)] px-5 py-3 md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Skeleton height="3.5rem" radius="lg" />
          <Skeleton width="3.5rem" height="3.5rem" radius="md" className="shrink-0" />
        </div>
      </div>

      {/* The category tiles and the active-filter rail beneath the bar. */}
      <div className="mt-5 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width="6.5rem" height="2.75rem" radius="pill" className="shrink-0" />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <Skeleton width="11rem" height="1rem" radius="sm" />
        <Skeleton width="8rem" height="2.75rem" radius="pill" className="shrink-0" />
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <SkeletonCard />
          </li>
        ))}
      </ul>
    </LoadingShell>
  );
}
