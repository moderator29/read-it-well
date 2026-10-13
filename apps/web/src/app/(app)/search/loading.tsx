import { Skeleton } from "@/components/ui/Skeleton";
import { ResultListSkeleton } from "@/components/app/search/ResultSkeleton";
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
        {/* The back control and the one search box (field, filters, order). */}
        <div className="mx-auto flex max-w-3xl items-center gap-xs">
          <Skeleton width="2.75rem" height="2.75rem" radius="pill" className="shrink-0" />
          <Skeleton height="3.25rem" radius="sm" />
        </div>
        {/* The chip row: the quick chips, then the filter chips. */}
        <div className="mx-auto mt-sm flex max-w-3xl gap-xs overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} width="6rem" height="2.75rem" radius="sm" className="shrink-0" />
          ))}
        </div>
      </div>

      <div className="mt-md flex items-center justify-between gap-md">
        <Skeleton width="11rem" height="1rem" radius="sm" />
      </div>

      {/* The results as they will draw: one card per row on a phone, each
          slot the row card's own shape (`ResultSkeleton.tsx`). */}
      <div className="mt-md">
        <ResultListSkeleton count={3} />
      </div>
    </LoadingShell>
  );
}
