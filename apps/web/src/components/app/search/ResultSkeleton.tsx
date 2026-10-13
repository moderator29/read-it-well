import { Skeleton } from "@/components/ui/Skeleton";
import { panelClass } from "@/components/ui/Panel";
import "@/app/css/catalogue.css";
import "./search-v2.css";

/**
 * THE RESULT CARD'S OWN SKELETON (Session 3, W2; north star motion 16, Stage
 * 5 "shaped skeletons").
 *
 * `SkeletonCard` is the generic card. A results grid is not generic: the card
 * it stands in for leads with the move-in total and carries the rent beneath,
 * and a skeleton that draws one bar where the card will draw two tells the eye
 * the wrong shape and then moves under it. So this one is the card's shape,
 * in the card's order: the photograph inside its inset frame (hatched, the
 * chart system's mark for "nothing here yet", so it reads as a frame waiting
 * rather than a grey slab), the market word, the title, the place, the
 * move-in figure as the widest, tallest bar, the rent as a thinner one, then
 * the facts row.
 *
 * Server-safe, no motion of its own beyond the register's shimmer, which
 * stops under reduced motion. The real grid replaces it with the cards' own
 * staggered entrance, which is the crossfade from skeleton to content.
 */
export function ResultCardSkeleton({ dense = true }: { dense?: boolean }) {
  return (
    <div aria-hidden="true" className={panelClass({ variant: "card", className: "nf-rskel block overflow-hidden p-0" })}>
      <span className="nf-rskel__media" />
      <div className="nf-rskel__body">
        <Skeleton width="34%" height="0.75rem" radius="xs" />
        <Skeleton className="mt-2xs" width="86%" height="0.9375rem" radius="xs" />
        <Skeleton className="mt-2xs" width="58%" height="0.75rem" radius="xs" />
        <Skeleton className="mt-sm" width={dense ? "72%" : "48%"} height="1.375rem" radius="sm" />
        <Skeleton className="mt-2xs" width={dense ? "52%" : "34%"} height="0.75rem" radius="xs" />
        <div className="nf-rskel__facts">
          <Skeleton width="3rem" height="0.75rem" radius="xs" />
          <Skeleton width="3rem" height="0.75rem" radius="xs" />
        </div>
      </div>
    </div>
  );
}

/**
 * THE ROW CARD'S SKELETON (search-map track): the one-per-row result card's
 * shape, in its order. The photograph's frame at 16:10, hatched, then the
 * separate panel: the title and the place on the left, the figure and its
 * period on the right, then the facts line.
 */
export function ResultRowSkeleton() {
  return (
    <div aria-hidden="true" className={panelClass({ variant: "card", className: "nf-rskel nf-rskel--row block overflow-hidden" })}>
      <span className="nf-rskel__media" />
      <div className="nf-pcard__panel">
        <div className="nf-pcard__panel-top">
          <div className="min-w-0 flex-1">
            <Skeleton width="78%" height="1rem" radius="xs" />
            <Skeleton className="mt-2xs" width="52%" height="0.75rem" radius="xs" />
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <Skeleton width="5.5rem" height="1.25rem" radius="sm" />
            <Skeleton className="mt-2xs" width="3.5rem" height="0.625rem" radius="xs" />
          </div>
        </div>
        <div className="flex gap-md">
          <Skeleton width="3.5rem" height="0.75rem" radius="xs" />
          <Skeleton width="3.5rem" height="0.75rem" radius="xs" />
          <Skeleton width="3.5rem" height="0.75rem" radius="xs" />
        </div>
      </div>
    </div>
  );
}

/** The one-per-row list as it will draw: one across on a phone, two from a tablet. */
export function ResultListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="nf-results--one" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ResultRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** A grid of them, two across on a phone and four from `lg`, as the results draw. */
export function ResultGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-sm sm:gap-md lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ResultCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
