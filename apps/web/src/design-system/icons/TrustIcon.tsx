/**
 * Trust bar icons.
 *
 * Four slots the photographic pack cannot serve, drawn as vector on the same
 * lit tile the pack uses because the versions on the reference sheet are only
 * about 35px, well under what a 40px tile needs.
 *
 * THERE IS NO RAW COLOUR IN THIS FILE ANY MORE, and there is no third-party
 * mark either. It used to carry thirty hardcoded hex values: Apple's App Store
 * gradient, Google Play's four brand ramps, and a `#fff` ink painted on top of
 * them. Both store marks are gone with the "Available on the App Store and
 * Play Store" claim they illustrated, because RentMe is on neither store, and
 * with them went the only reason this file ever needed a colour it could not
 * theme.
 *
 * WHY TOKENS AND NOT THE PALETTE MIRROR. The four remaining ramps read from
 * `@naijafinds/design-tokens`' semantic layer, as `var(--nf-...)` strings
 * dropped into SVG gradient stops. That is a deliberate change from the
 * palette mirror they used before: a palette entry is one fixed hex, so a tile
 * built from it is the same tile in daylight as at midnight, and the owner
 * asked for icons that respond to the theme. A `var()` in a `stop-color`
 * resolves against the element's own computed style, so these tiles now change
 * with the theme like everything else on the page.
 *
 * The one thing NOT tokenised as ink is the mark drawn on the tile: the tile
 * is a saturated brand gradient in both themes, so the glyph on it takes
 * `--nf-content-on-brand`, which is exactly the token for ink that sits on
 * brand colour rather than on a surface.
 */
import { token } from "@naijafinds/design-tokens";

export type TrustIconName =
  | "globe"
  | "shield"
  | "ai-chip"
  | "africa"
  /*
   * The two store marks, added back for the landing page's fifth trust item at
   * the owner's request.
   *
   * They are drawn here rather than restored from the pre-session version of
   * this file. That version carried 42 raw hex literals, cleaning them was a
   * real improvement, and bringing the old file back wholesale would have
   * undone it to gain two glyphs. These two are built from the same ramp and
   * the same ink token as their four neighbours, so they sit in the row
   * looking like they belong to it.
   *
   * Both are simplified marks, not the official badges. Apple and Google both
   * publish brand guidelines that govern their exact artwork, and a redrawn
   * approximation of an official badge is the kind of thing that gets a store
   * submission rejected. A generic bag and a generic play triangle say
   * "available on" without pretending to be either company's asset.
   */
  | "app-store"
  | "play-store";

type Ramp = [string, string, string];

/** Ink on a brand-coloured tile. The semantic token for exactly that. */
const MARK_INK = token.contentOnBrand;

const RAMPS: Record<TrustIconName, Ramp> = {
  globe: [token.brandAccent, token.brandSecondary, token.brandPrimaryStrong],
  shield: [token.brandAccent, token.brandPrimary, token.brandPrimaryStrong],
  "ai-chip": [token.brandAccent, token.brandSecondary, token.brandPrimary],
  africa: [token.brandAccent, token.brandPrimary, token.brandPrimaryStrong],
  "app-store": [token.brandAccent, token.brandSecondary, token.brandPrimaryStrong],
  "play-store": [token.brandAccent, token.brandPrimary, token.brandPrimaryStrong],
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
            stroke={token.brandPrimaryStrong}
            strokeWidth="2.1"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    /* A shopping bag with a download arrow: "get the app", drawn generically
       so it is not a redrawn Apple badge. */
    case "app-store":
      return (
        <>
          <path
            d="M5.6 8.2h12.8l-1 11.1a1.9 1.9 0 0 1-1.9 1.7H8.5a1.9 1.9 0 0 1-1.9-1.7Z"
            fill={MARK_INK}
            fillOpacity="0.92"
          />
          <path
            d="M9.1 8.2V6.6a2.9 2.9 0 0 1 5.8 0v1.6"
            stroke={MARK_INK}
            strokeWidth="1.7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M12 11.4v5.2m0 0 2.1-2.1M12 16.6l-2.1-2.1"
            stroke={token.brandPrimaryStrong}
            strokeWidth="1.9"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    /* The play triangle inside a rounded tile, again generic rather than the
       Google Play chevron mark. */
    case "play-store":
      return (
        <>
          <rect
            x="4.4"
            y="4.4"
            width="15.2"
            height="15.2"
            rx="3.6"
            fill={MARK_INK}
            fillOpacity="0.92"
          />
          <path
            d="M10.4 8.9v6.2l5.1-3.1Z"
            fill={token.brandPrimaryStrong}
            stroke={token.brandPrimaryStrong}
            strokeWidth="1.4"
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
          <g fill={token.brandPrimaryStrong}>
            <path d="M8.5 15.1 10.35 9h1.5l1.85 6.1h-1.36l-.35-1.28h-1.79l-.34 1.28Zm2.06-2.33h1.2l-.6-2.2Z" />
            <path d="M14.3 9h1.32v6.1H14.3Z" />
          </g>
        </>
      );

    case "africa":
      return (
        <>
          <defs>
            <linearGradient id="nf-africa-fill" x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor={token.brandAccent} />
              <stop offset="45%" stopColor={token.brandSecondary} />
              <stop offset="100%" stopColor={token.stateSuccess} />
            </linearGradient>
          </defs>
          <path
            d={AFRICA}
            fill="url(#nf-africa-fill)"
            stroke={MARK_INK}
            strokeOpacity="0.5"
            strokeWidth="0.4"
            strokeLinejoin="round"
          />
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
          <stop offset="0%" stopColor={light} stopOpacity="0.55" />
          <stop offset="52%" stopColor={core} stopOpacity="0.9" />
          <stop offset="100%" stopColor={dark} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor={MARK_INK} stopOpacity="0.42" />
          <stop offset="45%" stopColor={MARK_INK} stopOpacity="0.06" />
          <stop offset="100%" stopColor={MARK_INK} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="1" y="1" width="62" height="62" rx="17" fill={`url(#${uid}-tile)`} />
      <rect x="1" y="1" width="62" height="62" rx="17" stroke={MARK_INK} strokeOpacity="0.22" />
      <path d="M18 1h28a17 17 0 0 1 17 17v5C55 11 39 3 18 1Z" fill={`url(#${uid}-spec)`} />

      <g transform="translate(14 14) scale(1.5)">
        <Glyph name={name} />
      </g>
    </svg>
  );
}
