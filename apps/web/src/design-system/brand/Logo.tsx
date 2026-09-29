import Image from "next/image";

/**
 * Vallo brand mark.
 *
 * The supplied asset, not a redraw. Three forms exist because they serve
 * different jobs:
 *
 *   `mark`     the five glass towers with the orbital swoosh under them, no
 *              wordmark and no tile. Pairs with live text so the wordmark
 *              stays selectable, translatable and crisp at any size.
 *   `lockup`   the whole supplied render: the glass tile, the mark inside it
 *              and VALLO set beneath. Used large and centred, on auth and
 *              hero surfaces.
 *   `icon`     the tile alone, square. Not rendered here: it is the app icon,
 *              consumed by the manifest, the favicon set and the native
 *              shells. `scripts/build-web-icons.mjs` fans it out.
 *
 * THE MARK HAS A REAL ALPHA CHANNEL NOW, AND WHAT THIS COMMENT USED TO SAY IS
 * KEPT BECAUSE IT EXPLAINS THE FILE ON DISK CHANGING UNDER THE SAME NAME.
 *
 * Until 16 September 2026 `vallo-mark.png` was a 640px square CROP out of the
 * app tile: three channels, no alpha, towers clipped, swoosh cut at both sides,
 * blue bleeding to every edge. At header size it read as a navy smudge inside a
 * hard square, and this comment defended that by saying the mark "carries its
 * own deep navy ground". That was making a virtue of a defect. The founder
 * asked for the logo to be more visible and for the container around it to go,
 * and the container WAS the defect.
 *
 * The mark is now the five towers and the swoosh alone, keyed off the tile with
 * the same brightest-channel technique that cut the icon sheets, feathered
 * where the tile's own panel bloom overlapped it. `scripts/build-brand-marks.mjs`
 * is the record, including the approaches that failed and the one-line render
 * to ask the founder for that would beat the extraction.
 *
 * ON PAPER THERE IS A DAYLIGHT TWIN (29 September 2026). The night artwork on
 * white reads as pale glass: 28 per cent of the wordmark's opaque pixels are
 * near-white catch-lights, and they vanish into the page. The light theme used
 * to hide that by putting the lockup in a navy pill with two looping lights
 * round its rim, which the founder found wrapped and dim. `vallo-mark-light.png`
 * and `vallo-wordmark-light.png` are the same drawing re-toned for paper: the
 * glow keyed away, the body a deep ink and the catch-lights a brighter blue, so
 * every opaque pixel clears 3:1 on white and the glass modelling survives.
 * `docs/BRAND_MARKS.md` section 8 is the recipe.
 *
 * BOTH FILES ARE IN THE DOCUMENT AND CSS PICKS ONE (`app/css/light.css`, "the
 * logo"), keyed on `data-theme`, which the before-paint script sets. Nothing
 * waits for React, so a theme change never shows the wrong artwork or a blank
 * frame once both are loaded, and a night island inside a light page
 * (`data-theme="dark"`: the landing hero, auth, the system moments) keeps the
 * night artwork. The hidden twin loads lazily, so the page does not pay for
 * artwork it is not showing; the cost is that the FIRST switch to the other
 * theme in a session can show the logo a moment after the rest of the page.
 */

/**
 * THE MARK IS NOT SQUARE, AND SAYING IT WAS PUT A WARNING ON EVERY PAGE.
 *
 * `vallo-mark.png` is 614 by 587: the extraction keyed the towers and the
 * swoosh out of the square tile, and what is left is slightly wider than it
 * is tall. This component declared `width={size} height={size}` anyway, which
 * is two separate faults in one line. `next/image` computes the rendered
 * height from the real file against the declared width, finds it disagrees
 * with the declared height, and logs "has either width or height modified,
 * but not the other" on every route that draws the logo, which is all of
 * them (R1, `docs/design/audits/r1/findings.md` A40). And anywhere a
 * stylesheet honoured the square, the mark was stretched 4.6 per cent taller
 * than the artwork.
 *
 * Declaring the true shape fixes both. The rendered size is still driven by
 * `size` through the style, so no call site changes and nothing moves on
 * screen except the 4.6 per cent that should never have been there.
 */
const MARK_INTRINSIC = { width: 614, height: 587 } as const;

/** The height `size` implies, at the artwork's real aspect. */
function markHeight(size: number): number {
  return Math.round((size * MARK_INTRINSIC.height) / MARK_INTRINSIC.width);
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
  const width = responsive
    ? `clamp(${Math.round(size * 0.72)}px, 6vw, ${size}px)`
    : size;
  const art = (night: boolean) => (
    <Image
      src={night ? "/brand/vallo-mark.png" : "/brand/vallo-mark-light.png"}
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
      /* 1024 by 1024 on disk, so the square here is the artwork's real shape
         and not the assumption that broke the mark above. */
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
 * Mark plus live wordmark.
 *
 * The word is live text rather than the supplied `vallo-wordmark.png`, because
 * a header wordmark has to stay crisp at every density, be selectable, and be
 * read aloud by a screen reader. The image is there for surfaces that want the
 * rendered chrome treatment.
 *
 * **There is no accent split and no tagline.** The old lockup set `Rent` in the
 * content colour and `Me` in the brand gradient, and carried FIND IT. RENT IT.
 * LOVE IT. underneath. Vallo is one word: splitting it would invent a seam the
 * artwork does not have, and the tagline belonged to a product that no longer
 * exists.
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
  const wordFontSize = responsive
    ? `clamp(${Math.round(wordSize * 0.8)}px, 4.4vw, ${wordSize}px)`
    : wordSize;
  return (
    <span className={`nf-logo ${className ?? ""}`}>
      <LogoMark size={size} responsive={responsive} title="Vallo" priority={priority} />
      {/*
        THE WORDMARK IS THE ASSET, not set type. Every render carries the
        chrome-blue VALLO beside the mark, and the repository has held that
        exact wordmark since the brand landed; the header was drawing the name
        in Poppins instead. The mark carries the accessible name, so this is
        decoration to a reader and the picture to everyone else.
      */}
      <span className="nf-logo__text">
        {/* V-78 and OPS-10: `sizes` names the DRAWN width, so the optimiser
            serves a file the size of the lockup instead of 828 or 1920 wide
            on every page. */}
        {(["night", "day"] as const).map((when) => (
          <Image
            key={when}
            src={when === "night" ? "/brand/vallo-wordmark.png" : "/brand/vallo-wordmark-light.png"}
            alt=""
            aria-hidden="true"
            width={758}
            height={167}
            /* OPS-10: drawn at most about wordSize × 4.5 wide; without this the
               optimiser served the 1920-wide version for a 78 px logo. */
            sizes={`${Math.ceil((wordSize * 758) / 167)}px`}
            priority={when === "night" ? priority : undefined}
            className={`nf-logo__word nf-logo-art nf-logo-art--${when}`}
            style={{ height: wordFontSize, width: "auto" }}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * The wordmark alone, both artworks, for a surface that sets the word apart
 * from the mark (the assistant's bar, the letter-by-letter assembly). The
 * pair is chosen by `app/css/light.css` exactly as in `Logo`, so a light page
 * gets the daylight twin and a night island keeps the night file.
 */
export function LogoWordmark({
  width,
  height,
  sizes,
  priority,
  className,
  style,
}: {
  /** Declared intrinsic box, as `next/image` wants it. */
  width: number;
  height: number;
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
          src={when === "night" ? "/brand/vallo-wordmark.png" : "/brand/vallo-wordmark-light.png"}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          sizes={sizes}
          priority={when === "night" ? priority : undefined}
          className={`nf-logo-art nf-logo-art--${when} ${className ?? ""}`}
          style={style}
        />
      ))}
    </>
  );
}
