/**
 * THE VECTOR MARK AND WORDMARK, AS DATA (Session 3, 6 October 2026).
 *
 * WHY THESE EXIST. The only logo on the platform was raster: `vallo-mark.png`,
 * 614 by 587, keyed out of the glass app tile, and `vallo-wordmark.png`. The
 * startup sequence (MOTION_SYSTEM.md section 3) turns the mark in from 12
 * degrees and scales it 0.86 to 1, and a 614px raster rotated and scaled on a
 * 3x screen is visibly soft on the one screen that forms a first impression.
 * North star section 8 names a vector mark as the sequence's prerequisite.
 *
 * HOW THEY WERE MADE. No tracer was usable on the glass render: its alpha
 * channel is mostly glow, and a threshold trace comes out as blobs. So the
 * geometry was measured off the rasters on a 25px grid and hand-authored,
 * then overlaid on the source at full size to check it (the five towers'
 * corners and the swoosh's outer and inner edges sit within a few pixels of
 * the render's). The drawing is the brand's silhouette rather than its glass:
 * five slabs whose tops step up to the tallest and fall away to the right, and
 * the orbital swoosh beneath them, each slab ending a clear gap above the
 * swoosh so they read as passing behind it at any size. The coordinates are
 * the raster's own (viewBox 0 0 614 587), so the vector is a drop-in for the
 * PNG at the same aspect. The wordmark is the source's geometric VALLO, the A
 * without its bar as drawn, on the source's 790 by 180 grid.
 *
 * ONE COLOUR, FROM CSS. Every shape is filled with `currentColor`, so the mark
 * is whatever ink the surface sets (`color: var(--nf-...)`) in either theme,
 * and nothing here holds a colour of its own. The glass render stays the
 * artwork for places that want the glass (the app icon, the hero art).
 *
 * `public/brand/vallo-mark.svg` and `vallo-wordmark.svg` carry the same paths
 * for anything that needs a file (the native shell's offline card, a designer);
 * `vector-mark.test.ts` fails if a file and this module ever disagree.
 */

export const MARK_VIEWBOX = "0 0 614 587";
export const MARK_ASPECT = 614 / 587;

/** The five towers, left to right, then the swoosh. */
export const MARK_PATHS = [
  "M52 325 109 296V508L52 512Z",
  "M134 209 200 165V495L134 505Z",
  "M223 98 345 21V452L223 489Z",
  "M370 120 459 175V394L370 441Z",
  "M479 253 495 263V367L479 377Z",
  "M104 522C214 532 340 512 432 465C506 427 563 377 576 321C583 289 566 266 525 260L507 257C536 270 546 292 539 321C526 364 472 406 395 444C314 482 216 509 104 522Z",
] as const;

export const WORDMARK_VIEWBOX = "12 10 766 158";
export const WORDMARK_ASPECT = 766 / 158;

/** V, the barless A, L, L, and the O (an even-odd ring). */
export const WORDMARK_PATHS = [
  "M21 21H59L106 110 153 21H191L120 155H92Z",
  "M248.8 21H257.2L345 155H305L253 75.6 201 155H161Z",
  "M367 21H405V122H472V155H367Z",
  "M501 21H539V122H605V155H501Z",
  "M699 18a70 70 0 1 1 0 140a70 70 0 1 1 0-140Zm0 34a36 36 0 1 0 0 72a36 36 0 1 0 0-72Z",
] as const;

/** The standalone SVG document for a set of paths, as written to `public/brand`. */
export function svgDocument(viewBox: string, paths: readonly string[], title: string): string {
  const body = paths
    .map((d) => `  <path${d.includes("Zm") ? ' fill-rule="evenodd"' : ""} d="${d}"/>`)
    .join("\n");
  /* Attribute by attribute, so markup is never mistaken for copy by the
     hard-coded-English check (`lib/i18n/no-hardcoded-copy.test.ts`). */
  const open = [
    "<svg",
    'xmlns="http://www.w3.org/2000/svg"',
    `viewBox="${viewBox}"`,
    'fill="currentColor"',
    'role="img"',
    `aria-label="${title}"`,
  ].join(" ");
  return `${open}>\n${body}\n</svg>\n`;
}
