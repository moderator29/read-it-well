import Image from "next/image";

/**
 * RentMe brand mark.
 *
 * The supplied asset, not a redraw. Two forms exist because they serve
 * different jobs:
 *
 *   `mark`   the liquid blob with the location pin, no wordmark. Pairs with
 *            live text so the wordmark stays selectable, translatable and
 *            crisp at any size.
 *   `lockup` the full supplied logo with RentMe set inside the blob. Used
 *            large and centred, on auth and hero surfaces.
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
      src="/brand/rentme-logo.png"
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
      src="/brand/rentme-logo.png"
      alt="RentMe"
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: "auto" }}
    />
  );
}

/**
 * Mark plus live wordmark. `Naija` in content colour, `Finds` carrying the
 * brand gradient, matching the supplied lockup.
 */
export function Logo({
  size = 40,
  wordSize = 21,
  tagline = false,
  responsive = false,
  className,
  priority,
}: {
  size?: number;
  wordSize?: number;
  tagline?: boolean;
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
      <LogoMark size={size} responsive={responsive} title="RentMe" priority={priority} />
      <span className="nf-logo__text">
        <span className="nf-logo__word" style={{ fontSize: wordFontSize }}>
          Rent<span className="nf-logo__word-accent">Me</span>
        </span>
        {tagline && <span className="nf-logo__tagline">Find it. Rent it. Love it.</span>}
      </span>
    </span>
  );
}
