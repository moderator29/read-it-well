import Image from "next/image";
import { MARK_VIEWBOX, WORDMARK_VIEWBOX } from "@/lib/brand/logo-geometry";

/**
 * THE VALLO LOGO (D81, 8 October 2026).
 *
 * The founder's new mark (three blue towers and one orange, inside an orbit
 * ring that sweeps from blue to orange) and the new wordmark (VALLO in blue,
 * an orange triangle in the A, an orange sweep on the O) replace every older
 * drawing on the platform. Both are vectors now, drawn from the references
 * in `docs/design/references/2026-10-08/` by `scripts/brand/logo-art.mjs`, and
 * `scripts/build-brand-logo.mjs` writes every file from them: these SVGs, the
 * PNGs for emails and share cards, the favicon, the PWA and native icons.
 *
 * TWO PALETTES, ONE DRAWING. `vallo-mark.svg` and `vallo-wordmark.svg` are the
 * night palette, for navy. The `-light` twins keep the same shapes and deepen
 * the blues and the orange so every opaque pixel holds 3:1 on white. Nothing
 * is baked behind either: no navy ground and no glow. A glow, where a surface
 * wants one, is CSS and on dark only.
 *
 * BOTH FILES ARE IN THE DOCUMENT AND CSS PICKS ONE (`app/css/light.css`, "the
 * logo"), keyed on `data-theme`, which the before-paint script sets, so a
 * theme change never waits on React and a night island inside a light page
 * (`data-theme="dark"`) keeps the night artwork. In light, the `.nf-logo`
 * lockup is still the founder's navy pill (29 September), so it shows the
 * night artwork too; the day twin serves a bare mark or wordmark on paper.
 *
 * THE SVGs ARE SERVED AS FILES, NOT INLINED. `next/image` passes an `.svg`
 * through unoptimised, so the logo is a few kilobytes, cached once, and sharp
 * at every size and density. `LogoMarkLive` (below) is the inline drawing,
 * for the few places the mark moves.
 */

/** The artwork's real shapes, so `next/image` never warns and nothing stretches. */
const MARK = { width: MARK_VIEWBOX.w, height: MARK_VIEWBOX.h } as const;
const WORD = { width: WORDMARK_VIEWBOX.w, height: WORDMARK_VIEWBOX.h } as const;

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
  const art = (night: boolean) => (
    <Image
      src={night ? "/brand/vallo-mark.svg" : "/brand/vallo-mark-light.svg"}
      /* The images are pictures only; the name, when there is one, is on the
         wrapper below, so it is spoken once whichever twin is showing. */
      alt=""
      aria-hidden
      width={size}
      height={markHeight(size)}
      priority={night ? priority : undefined}
      className={`nf-logo-art nf-logo-art--${night ? "night" : "day"} ${className ?? ""}`}
      style={{ width, height: "auto" }}
    />
  );
  /* `contents` keeps the wrapper out of layout, so a call site that styles
     the mark as a direct child of its own box sees the image as before. */
  return title ? (
    <span role="img" aria-label={title} className="contents">
      {art(true)}
      {art(false)}
    </span>
  ) : (
    <>
      {art(true)}
      {art(false)}
    </>
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
        {(["night", "day"] as const).map((when) => (
          <Image
            key={when}
            src={when === "night" ? "/brand/vallo-wordmark.svg" : "/brand/vallo-wordmark-light.svg"}
            alt=""
            aria-hidden="true"
            width={wordmarkWidth(wordSize)}
            height={wordSize}
            priority={when === "night" ? priority : undefined}
            className={`nf-logo__word nf-logo-art nf-logo-art--${when}`}
            style={{ height: wordHeight, width: "auto" }}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * The wordmark alone, both artworks, for a surface that sets the word apart
 * from the mark (the assistant's bar, the letter-by-letter assembly). The
 * pair is chosen by `app/css/light.css` exactly as in `Logo`.
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
    <>
      {(["night", "day"] as const).map((when) => (
        <Image
          key={when}
          src={when === "night" ? "/brand/vallo-wordmark.svg" : "/brand/vallo-wordmark-light.svg"}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          priority={when === "night" ? priority : undefined}
          className={`nf-logo-art nf-logo-art--${when} ${className ?? ""}`}
          style={style}
        />
      ))}
    </>
  );
}

