/**
 * PHOTOS IN A BUBBLE, AT THEIR OWN PROPORTIONS (founder, 11 October 2026).
 * Pure, so it is tested rather than trusted.
 *
 *   ONE PHOTO fills the bubble: the bubble is the photo's own shape, as wide
 *   as the column allows (25rem at most) and never taller than 22rem, which
 *   for a tall photo means narrower rather than cropped.
 *
 *   TWO OR THREE sit in one row at one shared height, each at its own
 *   proportions, together exactly the bubble's width: a justified row. Width
 *   over height is all it takes: photo i gets ratio_i / sum of ratios of the
 *   row's width (less the gaps), so every photo comes out the same height
 *   and none is cropped or padded.
 *
 *   MORE THAN THREE: the first three make that row, and the rest continue to
 *   the right at the same height, reached by swiping the group. A dot per
 *   three photos says where the reader is.
 *
 * A photo whose size is not known yet (an old row, or one still uploading)
 * is laid out square until it loads and is measured.
 */
export const PHOTOS_PER_ROW = 3;
/** The gap between two photos in a row, in CSS pixels. */
export const PHOTO_GAP_PX = 2;
/** The tallest a row of photos is drawn, in rem. */
export const PHOTO_MAX_HEIGHT_REM = 22;
/** The widest a bubble of photos is drawn, in rem. */
export const PHOTO_MAX_WIDTH_REM = 25;

export type PhotoSize = { width: number; height: number };

/** Width over height, or null for a size that cannot be used. */
export function ratioOf(size: PhotoSize | null | undefined): number | null {
  if (!size) return null;
  const { width, height } = size;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return width / height;
}

export type PhotoLayout = {
  /** The group's width, as a CSS length with no percentage in it. */
  width: string;
  /** Per photo: its flex basis as a share of the row (less the gaps), and its ratio. */
  cells: { basis: string; ratio: number }[];
  /** One dot per three photos; 1 means no dots and no swiping. */
  pages: number;
};

const round = (n: number) => Math.round(n * 10000) / 10000;

export function photoLayout(ratios: readonly (number | null)[]): PhotoLayout {
  const known = ratios.map((r) => (r !== null && Number.isFinite(r) && r > 0 ? r : 1));
  const row = known.slice(0, PHOTOS_PER_ROW);
  const sum = row.reduce((a, b) => a + b, 0) || 1;
  const gaps = Math.max(0, row.length - 1) * PHOTO_GAP_PX;
  return {
    /* As wide as the row would be at the tallest height, never wider than the
       cap; the column's own width caps it again in the stylesheet. No
       percentage here, so the bubble's width never depends on itself. */
    width: `min(${PHOTO_MAX_WIDTH_REM}rem, calc(${PHOTO_MAX_HEIGHT_REM}rem * ${round(sum)} + ${gaps}px))`,
    cells: known.map((ratio) => ({
      basis: `calc((100% - ${gaps}px) * ${round(ratio / sum)})`,
      ratio: round(ratio),
    })),
    pages: ratios.length > PHOTOS_PER_ROW ? Math.ceil(ratios.length / PHOTOS_PER_ROW) : 1,
  };
}

/**
 * The page the strip is on, from how far it has scrolled and where each page
 * starts: the start nearest the scroll position, and the last page once the
 * strip is scrolled to its end (a short last page cannot reach the left edge).
 */
export function pageAt(scrollLeft: number, maxScroll: number, starts: readonly number[]): number {
  if (starts.length === 0) return 0;
  if (maxScroll > 0 && scrollLeft >= maxScroll - 1) return starts.length - 1;
  let best = 0;
  for (let i = 1; i < starts.length; i += 1) {
    if (Math.abs(starts[i]! - scrollLeft) < Math.abs(starts[best]! - scrollLeft)) best = i;
  }
  return best;
}
