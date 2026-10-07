/**
 * THE SESSION 3 PRIMITIVE FAMILIES, ONE ROUTE EACH (B-33, the living component
 * gallery).
 *
 * This list is the whole table of contents of the system gallery: the frame's
 * navigation reads it, and `docs/design/COMPONENTS.md` names the same routes
 * in its last column. A family that is not here has no gallery route, which is
 * the gap B-33 is about; add the route and the line together.
 *
 * Routes are STATIC directories next to `ported/` and `features/` rather than
 * one dynamic `[family]` route, because `route-files.test.ts` matches patterns
 * exactly and `/gallery/ported` is already declared on its own. Each one is
 * therefore a `NON_NAVIGABLE` entry in `lib/nav/route-parents.ts`, like B5's.
 */
export type GalleryFamily = {
  /** The path under `/gallery`, also the directory name. */
  slug: string;
  /** The family's name as a heading. Plain nouns, sentence case. */
  title: string;
  /** What the route shows, in one clause. */
  shows: string;
};

export const GALLERY_FAMILIES: readonly GalleryFamily[] = [
  { slug: "containers", title: "Containers", shows: "Plate, Card, Card figure, Island and Sheet" },
  { slug: "figures", title: "Figures", shows: "Figure, Amount, CountUp and Odometer" },
  { slug: "segmented", title: "Segmented", shows: "Segmented and SegmentedPanel" },
  { slug: "buttons", title: "Buttons", shows: "Every role, size and the action morph" },
  { slug: "toast", title: "Toast", shows: "The one toast and its tones" },
  { slug: "status-chip", title: "Status chip", shows: "Every state, said three ways" },
  { slug: "skeleton", title: "Skeleton", shows: "Shaped stand-ins and SkeletonSwap" },
  { slug: "document-sheet", title: "Document sheet", shows: "Kinds document and receipt" },
  { slug: "charts", title: "Charts", shows: "PeriodBars, TrendLine, CompareBars, ChartTable" },
  { slug: "today-hero", title: "Today hero", shows: "The workspace figure hero" },
  { slug: "brand-icons", title: "Brand icons", shows: "Tiered objects on night and on paper" },
] as const;
