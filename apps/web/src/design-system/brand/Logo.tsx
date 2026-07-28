import Image from "next/image";

/**
 * NaijaFinds brand mark.
 *
 * The supplied asset, not a redraw. Two forms exist because they serve
 * different jobs:
 *
 *   `mark`   the liquid blob with the location pin, no wordmark. Pairs with
 *            live text so the wordmark stays selectable, translatable and
 *            crisp at any size.
 *   `lockup` the full supplied logo with NaijaFinds set inside the blob. Used
 *            large and centred, on auth and hero surfaces.
 */

export function LogoMark({
  size = 44,
  className,
  title,
  priority,
}: {
  size?: number;
  className?: string;
  title?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/mark.png"
      alt={title ?? ""}
      aria-hidden={title ? undefined : true}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{ width: size, height: "auto" }}
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
      src="/brand/logo.png"
      alt="NaijaFinds"
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
  className,
  priority,
}: {
  size?: number;
  wordSize?: number;
  tagline?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`nf-logo ${className ?? ""}`}>
      <LogoMark size={size} title="NaijaFinds" priority={priority} />
      <span className="nf-logo__text">
        <span className="nf-logo__word" style={{ fontSize: wordSize }}>
          Naija<span className="nf-logo__word-accent">Finds</span>
        </span>
        {tagline && <span className="nf-logo__tagline">Find it. Book it. Live it.</span>}
      </span>
    </span>
  );
}
