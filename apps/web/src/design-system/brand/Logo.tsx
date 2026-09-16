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
 * ON PAPER the mark still reads correctly, as glass with a soft blue halo
 * rather than a dark slab, so there is still exactly one asset for both themes
 * and still no ink variant. The reasoning about recolouring survives: an ink
 * version of a photographic glass render is a new render, not a filter.
 */

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
  return (
    <Image
      src="/brand/vallo-mark.png"
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width, height: "auto" }}
    />
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
      <span className="nf-logo__text">
        <span className="nf-logo__word" style={{ fontSize: wordFontSize }}>
          Vallo
        </span>
      </span>
    </span>
  );
}
