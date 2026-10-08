import { OG_MARK_ASPECT, OG_MARK_URI, OG_WORDMARK_ASPECT, OG_WORDMARK_URI } from "@/lib/brand/og-logo";

/**
 * THE LOGO ON A SHARE CARD (D81, 8 October 2026).
 *
 * Every unfurl used to sign itself with a small blue square and VALLO set in
 * type. It is the new artwork now: the mark beside the wordmark, both drawn
 * from the same vectors as `public/brand/`, carried in as data URIs because
 * Satori draws images and has no stylesheet. Night palette, because every
 * card is drawn on the dark tokens (`og-palette.ts`).
 *
 * `height` is the wordmark's cap height; the mark stands a little taller
 * beside it, the way the header lockup does.
 */
export function OgLogo({ height, mark = true }: { height: number; mark?: boolean }) {
  const markHeight = Math.round(height * 1.55);
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {mark ? (
        // Satori draws this; there is no browser here for next/image to serve.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={OG_MARK_URI}
          alt=""
          width={Math.round(markHeight * OG_MARK_ASPECT)}
          height={markHeight}
          style={{ marginRight: Math.round(height * 0.5) }}
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={OG_WORDMARK_URI} alt="Vallo" width={Math.round(height * OG_WORDMARK_ASPECT)} height={height} />
    </div>
  );
}
