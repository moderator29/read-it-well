import Image from "next/image";
import { MARK_VIEWBOX, WORDMARK_VIEWBOX } from "@/lib/brand/logo-geometry";

/**
 * THE VALLO LOGO (D81 and D82, 8 October 2026).
 *
 * The founder's new mark (three blue towers and one orange, inside an orbit
 * ring that sweeps from blue to orange) and the new wordmark (VALLO in blue,
 * an orange triangle in the A, an orange sweep on the O) replace every older
 * drawing on the platform. Both are vectors, drawn from the references in
 * `docs/design/references/2026-10-08/` by `scripts/brand/logo-art.mjs`, and
 * `scripts/build-brand-logo.mjs` writes every file from them.
 *
 * ONE ARTWORK, NEVER RECOLOURED (D82). The founder: "make the logo and the
 * text to be not change color should be same either on light mode or dark
 * mode". So there is one file for the mark and one for the wordmark, in the
 * founder's own colours, drawn the same on navy, on paper and on the brand
 * blue: no day twin, no theme switch, no filter, and no navy pill put behind
 * it to change how it looks in light mode. `design-system/brand/logo-sweep.test.ts`
 * fails if any of that comes back. Nothing is baked behind the artwork.
 *
 * THE SVGs ARE SERVED AS FILES, NOT INLINED. `next/image` passes an `.svg`
 * through unoptimised, so the logo is a few kilobytes, cached once, and sharp
 * at every size and density. `LogoMarkLive` is the inline drawing, for the few
 * places the mark moves.
 */

/** The artwork's real shapes, so `next/image` never warns and nothing stretches. */
const MARK = { width: MARK_VIEWBOX.w, height: MARK_VIEWBOX.h } as const;
const WORD = { width: WORDMARK_VIEWBOX.w, height: WORDMARK_VIEWBOX.h } as const;

/** The one mark file and the one wordmark file. */
export const MARK_SRC = "/brand/vallo-mark.svg";
export const WORDMARK_SRC = "/brand/vallo-wordmark.svg";

/** The wordmark's width for a given height. */
export function wordmarkWidth(height: number): number {
  return Math.round((height * WORD.width) / WORD.height);
}

/** The mark's height for a given width. */
export function markHeight(size: number): number {
  return Math.round((size * MARK.height) / MARK.width);
}

export function LogoMark({
  size = 48,
  responsive = false,
  className,
  title,
  priority,
}: {
  size?: number;
  /** Scale from a smaller phone size up to `size`, so the mark is never oversized on mobile. */
  responsive?: boolean;
  className?: string;
  title?: string;
  priority?: boolean;
}) {
  const width = responsive ? `clamp(${Math.round(size * 0.72)}px, 6vw, ${size}px)` : size;
  return (
    <Image
      src={MARK_SRC}
      /* The name, when there is one, is the picture's alt; without one the
         mark is decoration beside words that already say Vallo. */
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={size}
      height={markHeight(size)}
      priority={priority}
      className={`nf-logo-art ${className ?? ""}`}
      style={{ width, height: "auto" }}
    />
  );
}

/** The square lockup on brand navy (mark over wordmark), for large centred moments. */
export function LogoLockup({
  size = 200,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/vallo-logo.png"
      alt="Vallo"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: "auto" }}
    />
  );
}

/**
 * Mark plus wordmark. The mark carries the accessible name, so the wordmark
 * is decoration to a reader and the picture to everyone else. Vallo is one
 * word: no accent split and no tagline.
 */
export function Logo({
  size = 48,
  wordSize = 21,
  responsive = false,
  className,
  priority,
}: {
  size?: number;
  wordSize?: number;
  /** Scale the mark and wordmark down on phones, up to the given sizes on desktop. */
  responsive?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const wordHeight = responsive ? `clamp(${Math.round(wordSize * 0.8)}px, 4.4vw, ${wordSize}px)` : wordSize;
  return (
    <span className={`nf-logo ${className ?? ""}`}>
      <LogoMark size={size} responsive={responsive} title="Vallo" priority={priority} />
      <span className="nf-logo__text">
        <Image
          src={WORDMARK_SRC}
          alt=""
          aria-hidden="true"
          width={wordmarkWidth(wordSize)}
          height={wordSize}
          priority={priority}
          className="nf-logo__word nf-logo-art"
          style={{ height: wordHeight, width: "auto" }}
        />
      </span>
    </span>
  );
}

/**
 * The wordmark alone, for a surface that sets the word apart from the mark
 * (the assistant's bar, the landing capsule, the letter-by-letter assembly).
 */
export function LogoWordmark({
  width,
  height,
  priority,
  className,
  style,
}: {
  /** Declared box, as `next/image` wants it. */
  width: number;
  height: number;
  /** Kept for call sites written for the raster wordmark; an SVG needs none. */
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Image
      src={WORDMARK_SRC}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      priority={priority}
      className={`nf-logo-art ${className ?? ""}`}
      style={style}
    />
  );
}
