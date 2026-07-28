import { iridescentRamp } from "@naijafinds/design-tokens";

/**
 * NaijaFinds brand mark.
 *
 * An organic spatial form rather than a literal house, bed or map pin, per the
 * brand direction. The lobed silhouette reads as movement and discovery, and
 * stays legible down to favicon size because the counter of the N is cut clean
 * through the body instead of being drawn as a thin stroke.
 */

type MarkProps = {
  size?: number;
  /** Adds the ambient bloom. Turn off for favicons and dense rows. */
  glow?: boolean;
  className?: string;
  title?: string;
};

export function LogoMark({ size = 44, glow = true, className, title }: MarkProps) {
  const uid = "nf-mark";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id={`${uid}-iris`} x1="0.08" y1="0" x2="0.92" y2="1">
          {iridescentRamp.map((s) => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
        <radialGradient id={`${uid}-sheen`} cx="0.32" cy="0.26" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-bloom`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && <circle cx="32" cy="33" r="30" fill={`url(#${uid}-bloom)`} />}

      {/*
       * The blob. Four asymmetric lobes on a squarish body so it never reads as
       * a plain circle at small sizes, which is where generic marks collapse.
       */}
      <path
        d="M32 3.6c6.1 0 9.9-2.2 14.6.4 4.7 2.6 5.1 7 8.1 11.2 3 4.2 6.1 6.2 6.1 12.3 0 6.1-3.6 8.3-5.7 13.1-2.1 4.8-1.4 9.6-5.8 12.9-4.4 3.3-8.6 1.2-14.1 2.1-5.5.9-8.6 4-14.1 2.4-5.5-1.6-6.6-6-10.3-9.6C7.1 44.8 2.6 43.4 1.4 37.5.2 31.6 3.6 28.9 5 23.9c1.4-5 .3-9.7 4.2-13.4C13.1 6.8 17.6 8.3 23 6.6c3-.9 5.4-3 9-3Z"
        fill={`url(#${uid}-iris)`}
      />
      <path
        d="M32 3.6c6.1 0 9.9-2.2 14.6.4 4.7 2.6 5.1 7 8.1 11.2 3 4.2 6.1 6.2 6.1 12.3 0 6.1-3.6 8.3-5.7 13.1-2.1 4.8-1.4 9.6-5.8 12.9-4.4 3.3-8.6 1.2-14.1 2.1-5.5.9-8.6 4-14.1 2.4-5.5-1.6-6.6-6-10.3-9.6C7.1 44.8 2.6 43.4 1.4 37.5.2 31.6 3.6 28.9 5 23.9c1.4-5 .3-9.7 4.2-13.4C13.1 6.8 17.6 8.3 23 6.6c3-.9 5.4-3 9-3Z"
        fill={`url(#${uid}-sheen)`}
      />

      {/* The N, cut as a solid so it survives small sizes */}
      <path
        d="M23.4 44.6V19.4h6.2l10.2 14.1V19.4h6.4v25.2h-6.2L29.8 30.4v14.2Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

type LogoProps = MarkProps & {
  /** Show the tagline under the wordmark. */
  tagline?: boolean;
  /** Wordmark size in px. */
  wordSize?: number;
};

export function Logo({
  size = 40,
  wordSize = 21,
  glow = true,
  tagline = false,
  className,
}: LogoProps) {
  return (
    <span className={`nf-logo ${className ?? ""}`}>
      <LogoMark size={size} glow={glow} title="NaijaFinds" />
      <span className="nf-logo__text">
        <span className="nf-logo__word" style={{ fontSize: wordSize }}>
          Naija<span className="nf-logo__word-accent">Finds</span>
        </span>
        {tagline && <span className="nf-logo__tagline">Find it. Book it. Live it.</span>}
      </span>
    </span>
  );
}
