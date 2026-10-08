import { LogoMark, LogoWordmark, wordmarkWidth } from "@/design-system/brand/Logo";

/**
 * THE BRAND ASSEMBLING ITSELF (Track M, 25 September 2026).
 *
 * The founder's reference is the apartments.com app opening: the mark turns in
 * depth with motion blur and settles, and the wordmark arrives a letter at a
 * time, each one coming out of depth blurred and grey before it lands sharp,
 * while the whole lockup grows to its size. This draws that with Vallo's own
 * artwork and changes none of it.
 *
 * The wordmark is one image, so it is drawn five times, each copy clipped to
 * one letter. The new wordmark (D81, `public/brand/vallo-wordmark.svg`) leans:
 * the V's right ribbon and the A's left leg run side by side on a diagonal,
 * and the A's right foot tucks under the first L's rounded corner, so those
 * two cuts are slanted polygons along the gaps (measured in the drawing's own
 * coordinates, `scripts/brand/logo-art.mjs`) and the other two are straight.
 * Each slice then runs the same arrival with its own delay, which is what
 * makes the word read as typed out of the air.
 *
 * Server-safe: markup only. The motion is `.nf-assemble` in threshold.css, and
 * it has a reduced-motion answer there (the finished lockup, still).
 */
/* Each letter's clip, in per cent of the wordmark's box (x then y). */
const LETTERS = [
  "polygon(0 0, 32% 0, 16.9% 100%, 0 100%)",
  "polygon(32% 0, 43.9% 0, 47.4% 67.6%, 49.9% 100%, 16.9% 100%)",
  "polygon(43.9% 0, 63% 0, 63% 100%, 49.9% 100%, 47.4% 67.6%)",
  "polygon(63% 0, 76.8% 0, 76.8% 100%, 63% 100%)",
  "polygon(76.8% 0, 100% 0, 100% 100%, 76.8% 100%)",
] as const;

export function BrandAssemble({ size = 64, className }: { size?: number; className?: string }) {
  const wordHeight = Math.round(size * 0.42);
  const wordWidth = wordmarkWidth(wordHeight);
  return (
    <span className={`nf-assemble ${className ?? ""}`} aria-hidden="true">
      <span className="nf-assemble__mark">
        {/* One artwork in both themes (D82). */}
        <LogoMark size={size} priority />
      </span>
      <span className="nf-assemble__word" style={{ width: wordWidth, height: wordHeight }}>
        {LETTERS.map((clipPath, i) => (
          <span
            key={clipPath}
            className="nf-assemble__letter"
            style={{ "--nf-i": i, clipPath } as React.CSSProperties}
          >
            <LogoWordmark width={wordWidth} height={wordHeight} sizes={`${wordWidth}px`} priority />
          </span>
        ))}
      </span>
    </span>
  );
}
