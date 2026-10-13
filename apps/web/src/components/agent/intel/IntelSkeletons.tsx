import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The shapes Space Analytics and Listing Health wait in (no spinner, north
 * star 12 point 12): each drawn at the finished card's proportions, so the
 * figure lands in the box already waiting for it and nothing below moves.
 */

/** The figure card: caption and period control, the figure, the chart, the rows. */
export function FigureCardSkeleton({ rows = 4, segmented = true }: { rows?: number; segmented?: boolean }) {
  return (
    <div className="nf-panel nf-panel--card nf-panel--figure block p-md sm:p-panel">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <Skeleton width="8rem" height="0.75rem" radius="sm" />
        {segmented ? (
          <Skeleton width="15rem" height="2.25rem" radius="pill" className="max-w-full" />
        ) : (
          <Skeleton width="7rem" height="0.8125rem" radius="sm" />
        )}
      </div>
      <Skeleton className="mt-sm" width="5rem" height="2.5rem" radius="sm" />
      <Skeleton className="mt-2xs" width="9rem" height="0.8125rem" radius="sm" />
      {/* The plot, at PeriodBars' own 176px. */}
      <Skeleton className="mt-md" height="11rem" radius="md" />
      <div className="mt-md space-y-xs">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height="3.25rem" radius="md" />
        ))}
      </div>
    </div>
  );
}

/** An inner page's head: the way back, the title, one line of lede. */
export function InnerHeadSkeleton() {
  return (
    <div className="mb-lg">
      <Skeleton width="6rem" height="0.75rem" radius="sm" />
      <Skeleton className="mt-xs" width="14rem" height="1.75rem" radius="sm" />
      <Skeleton className="mt-2xs" width="80%" height="0.9375rem" radius="sm" />
    </div>
  );
}
