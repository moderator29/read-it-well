import { UI_ICON_STROKE_PX, snapUiIconSize } from "@/design-system/icons/UiIcon";

/**
 * FOUR LINE GLYPHS THE FEED IMAGE DRAWS AND THE ICON SET DOES NOT HAVE YET.
 *
 * The founder's ruling for the feed and the bloom is plain LINE icons, and his
 * image draws a pencil on Post, a camera on Story, two people on Following and
 * a repost as a LEVEL loop (two arrows chasing round a wide rectangle).
 * `UiIcon` has none of the first three and draws its repost standing on end, and `design-system/icons/UiIcon.tsx` is not
 * this surface's file, so they are drawn here on exactly its terms: the 24
 * grid, round caps and joins, `currentColor`, the same snapped size scale and
 * the same rendered weight (`UI_ICON_STROKE_PX`, 1.5 CSS px at every step).
 * Asking for them to move into `UiIcon` is request FEED-1 in the scope file;
 * when they land there, the call sites switch and this file is deleted.
 */
export type LineGlyphName = "pencil" | "camera" | "people" | "repost";

const PATHS: Record<LineGlyphName, React.ReactNode> = {
  /* A pencil leaning to the lower left, the render's Post glyph. */
  pencil: (
    <>
      <path d="M4.6 19.4l.9-4.1L15.7 5.1a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5l-4.1.9Z" />
      <path d="M13.9 6.9l3.2 3.2" />
      <path d="M5.5 15.3l3.2 3.2" />
    </>
  ),
  /* A camera body with its lens and the small window at the upper right. */
  camera: (
    <>
      <path d="M3.8 8.6A1.6 1.6 0 0 1 5.4 7h2.4l1.5-2.1h5.4L16.2 7h2.4a1.6 1.6 0 0 1 1.6 1.6v8.8a1.6 1.6 0 0 1-1.6 1.6H5.4a1.6 1.6 0 0 1-1.6-1.6Z" />
      <circle cx="12" cy="12.9" r="3.3" />
      <path d="M17 9.9h.01" />
    </>
  ),
  /* The repost the image draws: a wide loop, the top arrow running right and
     the foot arrow running left. */
  repost: (
    <>
      <path d="M4.5 12.2V9.6A2.4 2.4 0 0 1 6.9 7.2h11" />
      <path d="M15.4 4.6l2.6 2.6-2.6 2.6" />
      <path d="M19.5 11.8v2.6a2.4 2.4 0 0 1-2.4 2.4h-11" />
      <path d="M8.6 19.4L6 16.8l2.6-2.6" />
    </>
  ),
  /* Two people, the nearer whole and the further one behind its shoulder. */
  people: (
    <>
      <circle cx="9.4" cy="8.3" r="3.3" />
      <path d="M3.4 19.6a6 6 0 0 1 12 0" />
      <path d="M15.4 5.2a3.2 3.2 0 0 1 0 6.2" />
      <path d="M17.6 14.2a6 6 0 0 1 3 5.4" />
    </>
  ),
};

export function LineGlyph({
  name,
  size = 20,
  className,
}: {
  name: LineGlyphName;
  size?: number;
  className?: string;
}) {
  const edge = snapUiIconSize(size);
  return (
    <svg
      width={edge}
      height={edge}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={(UI_ICON_STROKE_PX * 24) / edge}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
