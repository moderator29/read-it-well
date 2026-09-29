import { LogoMark, LogoWordmark } from "@/design-system/brand/Logo";

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
 * one letter. The cut points were measured off the asset's alpha channel
 * (`public/brand/vallo-wordmark.png`, 758 by 167): the V and the A touch, so
 * their cut sits at the middle of their shared run, and the other three fall
 * in the gaps between letters. Each slice then runs the same arrival with its
 * own delay, which is what makes the word read as typed out of the air.
 *
 * Server-safe: markup only. The motion is `.nf-assemble` in threshold.css, and
 * it has a reduced-motion answer there (the finished lockup, still).
 */
const CUTS = [0, 21.5, 44.2, 61.5, 78.1, 100] as const;

export function BrandAssemble({ size = 64, className }: { size?: number; className?: string }) {
  const wordHeight = Math.round(size * 0.42);
  const wordWidth = Math.round((wordHeight * 758) / 167);
  return (
    <span className={`nf-assemble ${className ?? ""}`} aria-hidden="true">
      <span className="nf-assemble__mark">
        {/* `LogoMark` and `LogoWordmark` carry both artworks, so a light page
            assembles the daylight lockup and a night island the night one. */}
        <LogoMark size={size} priority />
      </span>
      <span className="nf-assemble__word" style={{ width: wordWidth, height: wordHeight }}>
        {CUTS.slice(0, -1).map((from, i) => (
          <span
            key={from}
            className="nf-assemble__letter"
            style={
              {
                "--nf-i": i,
                clipPath: `inset(0 ${100 - CUTS[i + 1]!}% 0 ${from}%)`,
              } as React.CSSProperties
            }
          >
            <LogoWordmark width={wordWidth} height={wordHeight} sizes={`${wordWidth}px`} priority />
          </span>
        ))}
      </span>
    </span>
  );
}
