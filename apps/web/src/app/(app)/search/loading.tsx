import { Skeleton } from "@/components/ui/Skeleton";
import { ResultGridSkeleton } from "@/components/app/search/ResultSkeleton";
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
      <div className="nf-glass nf-glass--chrome -mx-gutter -mt-group border-b border-[var(--nf-panel-hair)] px-gutter py-row">
        <div className="mx-auto flex max-w-3xl items-center gap-xs">
          <Skeleton height="3.5rem" radius="sm" />
          <Skeleton width="3.5rem" height="3.5rem" radius="sm" className="shrink-0" />
        </div>
      </div>

      {/* The category tiles and the active-filter rail beneath the bar. */}
      <div className="mt-md flex gap-xs overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width="6.5rem" height="2.75rem" radius="sm" className="shrink-0" />
        ))}
      </div>

      <div className="mt-md flex items-center justify-between gap-md">
        <Skeleton width="11rem" height="1rem" radius="sm" />
        <Skeleton width="8rem" height="2.75rem" radius="sm" className="shrink-0" />
      </div>

      {/* The results grid as it will draw: two across on a phone, four from
          `lg`, each slot the result card's own shape (`ResultSkeleton.tsx`),
          the move-in figure the widest bar because it is what leads. */}
      <div className="mt-md">
        <ResultGridSkeleton count={6} />
      </div>
    </LoadingShell>
  );
}
