/**
 * Trust bar icons.
 *
 * Six slots the photographic pack cannot serve. The versions on the reference
 * sheet are only about 35px, well under what a 40px tile needs, so these are
 * drawn as vector on the same lit tile the pack uses.
 *
 * The two store marks use their official brand geometry and colours rather than
 * a tinted silhouette, because a store badge that is not the real badge reads as
 * wrong immediately. They are drawn rather than fetched so nothing depends on an
 * external asset at runtime.
 *
 * THE LITERALS IN THIS FILE ARE THE ONE SANCTIONED EXCEPTION, and the
 * `nf/no-raw-colour` disables below say which and why. Apple's and Google's
 * badge colours are theirs, not ours: they cannot be tokenised, they must not
 * follow our theme, and approximating them is a trademark problem rather than
 * a design one. `#fff` inside a glyph is the ink ON those coloured tiles, so
 * it belongs to the same exception.
 *
 * Everything that was NOT a third-party mark has been moved onto the brand
 * family. The globe, shield and ai-chip ramps ran Tailwind indigo and violet
 * (#6366F1, #A5B4FC, #312E81, #4F46E5): four violets on the landing trust
 * strip, which is the first colour a visitor ever sees, in a product whose
 * palette states in writing that there is no violet in it.
 */
import { palette } from "@naijafinds/design-tokens";

export type TrustIconName =
  | "globe"
  | "shield"
  | "ai-chip"
  | "africa"
  | "app-store"
  | "play-store";

type Ramp = [string, string, string];

/*
 * The ink drawn on top of a coloured tile in this file.
 *
 * eslint-disable-next-line nf/no-raw-colour -- the tiles here are third-party
 * brand gradients and Apple's and Google's own artwork, so the mark on them is
 * their white rather than our content ink, and it must not follow the theme.
 */
// eslint-disable-next-line nf/no-raw-colour
const MARK_INK = "#fff";

const RAMPS: Record<TrustIconName, Ramp> = {
  // The four in-house ramps read from the palette mirror rather than from
  // literals, so they cannot drift away from the tokens again.
  globe: [palette.mist200, palette.sky400, palette.electric700],
  shield: [palette.mist200, palette.royal500, palette.royal700],
  "ai-chip": [palette.mist200, palette.electric300, palette.electric700],
  africa: [palette.mist200, palette.electric400, palette.electric700],
  /* eslint-disable-next-line nf/no-raw-colour -- Apple's App Store badge
     gradient. A third-party mark, not ours to tokenise or to theme. */
  "app-store": ["#3FC8FF", "#0A84FF", "#0040DD"],
  /* eslint-disable-next-line nf/no-raw-colour -- Google Play sits on white so
     its own four brand colours stay true. Same exception as above. */
  "play-store": ["#FFFFFF", "#F4F4F6", "#D8D9E0"],
};

/**
 * Africa.
 *
 * Generated from 39 real coastal points in lon/lat (Tangier clockwise round to
 * Agadir), equirectangular projected and fitted to the 24 grid, rather than
 * drawn by eye. That is why the Dakar bulge, the Gulf of Guinea, the Horn and
 * the Cape all land in the right places instead of approximately.
 */
const AFRICA =
  "M5.41 1.95 L7.99 1.66 L10.04 1.60 L10.91 2.79 L12.91 3.02 L15.75 3.28 " +
  "L16.50 3.66 L17.23 5.66 L17.87 7.10 L18.39 7.97 L19.55 8.64 L21.98 8.99 " +
  "L20.99 10.87 L20.21 11.74 L18.59 13.48 L18.47 14.29 L18.82 16.52 " +
  "L17.20 18.05 L16.53 19.82 L16.07 20.98 L12.88 22.40 L12.42 22.14 " +
  "L11.29 18.98 L10.48 16.90 L10.91 14.87 L10.57 13.77 L9.81 12.20 " +
  "L9.90 11.16 L8.68 11.07 L8.07 10.46 L7.03 10.73 L5.93 10.78 " +
  "L3.96 10.49 L3.27 9.86 L2.02 8.06 L2.45 7.08 L2.31 6.24 " +
  "L3.32 4.29 L4.31 3.51 Z";

function Glyph({ name }: { name: TrustIconName }) {
  switch (name) {
    case "globe":
      return (
        <g stroke={MARK_INK} strokeWidth="1.7" fill="none" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.4" />
          <ellipse cx="12" cy="12" rx="3.5" ry="8.4" />
          <path d="M3.9 9.2h16.2M3.9 14.8h16.2" />
        </g>
      );

    case "shield":
      return (
        <>
          <path
            d="M12 3.1 19.4 6.3v5.2c0 4.4-3 8.3-7.4 9.9-4.4-1.6-7.4-5.5-7.4-9.9V6.3Z"
            fill={MARK_INK}
            fillOpacity="0.92"
          />
          <path
            d="m8.9 12 2.3 2.3 4.1-4.3"
            stroke={palette.royal600}
            strokeWidth="2.1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    case "ai-chip":
      return (
        <>
          <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="2.6" fill={MARK_INK} fillOpacity="0.94" />
          <g stroke={MARK_INK} strokeWidth="1.6" strokeLinecap="round" opacity="0.85">
            <path d="M9.4 6.2V3.4M12 6.2V3.4M14.6 6.2V3.4M9.4 20.6v-2.8M12 20.6v-2.8M14.6 20.6v-2.8" />
            <path d="M6.2 9.4H3.4M6.2 12H3.4M6.2 14.6H3.4M20.6 9.4h-2.8M20.6 12h-2.8M20.6 14.6h-2.8" />
          </g>
          {/* Letterforms as geometry: an SVG text node cannot resolve a CSS
              custom property font, and the webfont may not have painted yet. */}
          <g fill={palette.electric700}>
            <path d="M8.5 15.1 10.35 9h1.5l1.85 6.1h-1.36l-.35-1.28h-1.79l-.34 1.28Zm2.06-2.33h1.2l-.6-2.2Z" />
            <path d="M14.3 9h1.32v6.1H14.3Z" />
          </g>
        </>
      );

    case "africa":
      return (
        <>
          <defs>
            {/* Blue family through to emerald. Emerald stays because it is one
                of the two hues that earn a place outside the family, and it is
                what makes the continent read as land rather than as a chip. */}
            <linearGradient id="nf-africa-fill" x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor={palette.mist200} />
              <stop offset="38%" stopColor={palette.electric300} />
              <stop offset="72%" stopColor={palette.electric400} />
              <stop offset="100%" stopColor={palette.emerald400} />
            </linearGradient>
          </defs>
          <path d={AFRICA} fill="url(#nf-africa-fill)" stroke={MARK_INK} strokeOpacity="0.5" strokeWidth="0.4" strokeLinejoin="round" />
        </>
      );

    case "app-store":
      /* Apple's mark, official geometry. */
      return (
        <path
          d="M16.62 12.62c-.03-2.63 2.15-3.9 2.25-3.96-1.22-1.79-3.12-2.03-3.8-2.06-1.62-.16-3.17.95-3.99.95-.82 0-2.09-.93-3.44-.9-1.77.03-3.4 1.03-4.31 2.61-1.84 3.19-.47 7.9 1.32 10.48.88 1.27 1.93 2.68 3.3 2.63 1.32-.05 1.82-.85 3.42-.85s2.05.85 3.44.82c1.42-.02 2.32-1.29 3.19-2.56 1.01-1.47 1.42-2.89 1.44-2.96-.03-.01-2.77-1.06-2.8-4.2ZM14.03 4.29c.73-.88 1.22-2.11 1.08-3.33-1.05.04-2.31.7-3.06 1.57-.68.78-1.27 2.02-1.11 3.21 1.17.09 2.36-.6 3.09-1.45Z"
          fill={MARK_INK}
        />
      );

    case "play-store":
      /* Google Play, four official brand colours. A third-party mark: not
         ours to tokenise, not ours to theme, and not ours to approximate. */
      /* eslint-disable nf/no-raw-colour */
      return (
        <>
          <defs>
            <linearGradient id="nf-play-a" x1="0.1" y1="0.05" x2="0.75" y2="0.72">
              <stop offset="0%" stopColor="#00A0FF" />
              <stop offset="100%" stopColor="#00E3FF" />
            </linearGradient>
            <linearGradient id="nf-play-b" x1="1" y1="0.5" x2="0" y2="0.5">
              <stop offset="0%" stopColor="#FFE000" />
              <stop offset="100%" stopColor="#FFBC00" />
            </linearGradient>
            <linearGradient id="nf-play-c" x1="0.86" y1="0.18" x2="0.1" y2="0.9">
              <stop offset="0%" stopColor="#FF3A44" />
              <stop offset="100%" stopColor="#C31162" />
            </linearGradient>
            <linearGradient id="nf-play-d" x1="0.1" y1="0.1" x2="0.55" y2="0.6">
              <stop offset="0%" stopColor="#32A071" />
              <stop offset="100%" stopColor="#00E574" />
            </linearGradient>
          </defs>
          <path d="M4.36 3.15c-.29.31-.46.78-.46 1.4v14.9c0 .62.17 1.09.46 1.4l.5.05 8.35-8.35v-.2L4.86 3.1Z" fill="url(#nf-play-a)" />
          <path d="m16 15.34-2.79-2.79v-.2l2.8-2.79.06.04 3.3 1.88c.95.53.95 1.41 0 1.95l-3.3 1.87Z" fill="url(#nf-play-b)" />
          <path d="m16.06 15.3-2.85-2.85-8.35 8.35c.31.33.83.37 1.41.04l9.79-5.54" fill="url(#nf-play-c)" />
          <path d="M16.06 9.6 6.27 4.06c-.58-.33-1.1-.29-1.41.04l8.35 8.35Z" fill="url(#nf-play-d)" />
          {/* eslint-enable nf/no-raw-colour */}
        </>
      );
  }
}

export function TrustIcon({
  name,
  size = 40,
  className,
}: {
  name: TrustIconName;
  size?: number;
  className?: string;
}) {
  const [light, core, dark] = RAMPS[name];
  const uid = `nf-trust-${name}`;
  const isPlay = name === "play-store";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-tile`} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0%" stopColor={light} stopOpacity={isPlay ? 1 : 0.55} />
          <stop offset="52%" stopColor={core} stopOpacity={isPlay ? 1 : 0.9} />
          <stop offset="100%" stopColor={dark} stopOpacity={isPlay ? 1 : 0.95} />
        </linearGradient>
        <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={MARK_INK} stopOpacity="0.42" />
          <stop offset="45%" stopColor={MARK_INK} stopOpacity="0.06" />
          <stop offset="100%" stopColor={MARK_INK} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="62" height="62" rx="17" fill={`url(#${uid}-tile)`} />
      <rect x="1" y="1" width="62" height="62" rx="17" stroke={MARK_INK} strokeOpacity={isPlay ? 0.35 : 0.22} />
      {!isPlay && <path d="M18 1h28a17 17 0 0 1 17 17v5C55 11 39 3 18 1Z" fill={`url(#${uid}-spec)`} />}

      <g transform="translate(14 14) scale(1.5)">
        <Glyph name={name} />
      </g>
    </svg>
  );
}
