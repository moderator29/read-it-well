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
 * THE LIGHT THEME, AND WHY THERE IS NO INK VARIANT ANY MORE.
 *
 * The old artwork shipped as a pair: a neon cutout for the night theme and an
 * ink recolour that CSS swapped in for paper, because the old mark was flat
 * blue shapes that a recolour could survive.
 *
 * The new mark cannot be recoloured that way. It is a photographic render of a
 * glass object lit from behind, and an ink version of it is a new render, not a
 * filter. Producing one by cutting the glow out and inverting leaves a halo,
 * which the brief forbids by name.
 *
 * So there is one mark and it is used on both themes. That is not a compromise
 * in the way it sounds: the mark carries its own deep navy ground, so on paper
 * it reads as a dark object sitting on a white card, which is exactly how an
 * app icon reads on a light home screen. **A proper ink re-render is still
 * wanted and the prompt for it is in `docs/BRAND_MARKS.md`.** Until it exists,
 * one asset is honest and two would be a bad cutout pretending to be a pair.
 */

export function LogoMark({
  size = 44,
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
  size = 40,
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
