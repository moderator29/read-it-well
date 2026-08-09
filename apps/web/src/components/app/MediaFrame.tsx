/**
 * The one photographic frame on the platform.
 *
 * Every place on RentMe that paints a listing photograph paints it on top of
 * this: the listing card, the gallery hero, the photo grid, the lightbox, the
 * map dock, the featured carousel and the message sheets. What shows through
 * when the photograph has not arrived, or the CDN cannot be reached, is this
 * frame rather than an empty box or a broken image icon.
 *
 * WHY IT EXISTS AS ONE FILE. Six files each carried their own copy of an
 * identical six-pair gradient array and an identical skyline path, and the
 * copies had already begun to disagree: three of them drew the moon and three
 * did not, two ran the silhouette at 0.6 opacity and one at 0.7, and one had
 * dropped `aria-hidden` from the SVG so a screen reader announced a graphic
 * with no name in the middle of a message thread. A fallback that differs by
 * surface is a fallback nobody can reason about.
 *
 * WHY THE COLOURS CHANGED. The six pairs were Tailwind's indigo, sky and slate
 * defaults: #1E3A8A, #155E75, #0C4A6E, #334155, #1E40AF, #312E81. None of them
 * is a RentMe colour, none of them came from the token layer, and all six were
 * dark, so in daylight an unloaded photograph punched a navy hole through a
 * white page. The ground now reads from `--nf-media-ground-*`, which is a
 * quiet depth of the surface family in each theme: a place with no photograph
 * looks like a place with no photograph, not like a designed feature.
 *
 * The VARIATION survives. A grid of twenty identical panes reads as a loading
 * bug, so the listing's own hue still decides something: it rotates the
 * gradient angle and nudges the skyline, deterministically, so neighbouring
 * cards differ without a second colour entering the palette.
 */

/** How many distinct angles a hue can resolve to. */
const ANGLES = [150, 168, 205, 132, 188, 218];

/**
 * Deterministic gradient angle for a listing.
 *
 * Exported because the card and the carousel apply the ground to their own
 * hover-scaling media layer rather than to a child of it, so they need the
 * angle without needing the element.
 */
export function mediaAngle(hue: number, index = 0): number {
  const at = Math.abs(hue + index) % ANGLES.length;
  return ANGLES[at] ?? ANGLES[0]!;
}

/** The ground a photograph sits on, as a CSS `background` value. */
export function mediaGround(hue: number, index = 0): string {
  return `linear-gradient(${mediaAngle(hue, index)}deg, var(--nf-media-ground-from) 0%, var(--nf-media-ground-to) 100%)`;
}

/**
 * The skyline silhouette, on its own so a surface that already paints the
 * ground (a hover-scaling media layer, a carousel pane) can lay the drawing
 * over it without a second background.
 */
export function MediaSkyline({ hue = 0, className }: { hue?: number; className?: string }) {
  // Two silhouettes, alternating, so a run of panes does not read as one wall.
  const path =
    hue % 2 === 0
      ? "M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
      : "M0 300V206h28v-44h36v44h30v-70h40v70h32v-52h34v52h28v-82h42v82h30v-36h30v36h36v-58h34v58Z";
  return (
    <svg
      viewBox="0 0 400 300"
      className={`absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path d={path} fill="var(--nf-media-silhouette)" />
      <circle cx={hue % 2 === 0 ? 322 : 84} cy="62" r="26" fill="var(--nf-media-moon)" />
    </svg>
  );
}

/**
 * The full frame: ground plus skyline, absolutely positioned to its parent.
 *
 * The parent must be `relative` and clip its own overflow, which every call
 * site already does because it is also positioning a `fill` image.
 */
export function MediaFrame({
  hue,
  /** Position in a run of panes, so neighbours do not share an angle. */
  index = 0,
  className,
}: {
  hue: number;
  index?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 ${className ?? ""}`}
      style={{ background: mediaGround(hue, index) }}
    >
      <MediaSkyline hue={hue + index} />
    </div>
  );
}
