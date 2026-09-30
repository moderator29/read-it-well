import type { StoreBadge } from "./store-badges";
import { BADGE } from "./store-badge-palette";

/**
 * The official store badges, drawn inline (Track M).
 *
 * APPLE'S AND GOOGLE'S ARTWORK, NOT OURS. Apple's "Download on the App Store"
 * is the black badge with the grey keyline, the Apple logo and the two-line
 * lockup on a 119.66 by 40 artboard; Google's "GET IT ON Google Play" is the
 * black badge with the four-colour play triangle on 135 by 40. Both stores
 * ask for exactly these, unaltered, at a height of 40 or more, and neither
 * may be recoloured to match a theme: they stay black in light mode too.
 * Inline SVG rather than a file so there is no extra request on the landing's
 * first screen, and so the badge is crisp at every density.
 *
 * WHICH BADGES APPEAR IS NOT DECIDED HERE. `storeBadges()` in
 * `store-badges.ts` decides; this component draws what it is handed. A badge
 * with a store address is a link. One without (`href: null`, the listing is
 * not live yet) is the same unaltered artwork, not a link and not dimmed
 * (neither store allows a badge to be faded or recoloured), with "Coming
 * soon" printed beneath it.
 *
 * The link (or the labelled group) carries the accessible name; the drawing
 * is hidden from assistive tech so the name is read once.
 */
export function StoreBadges({
  badges,
  labels,
  className,
}: {
  badges: StoreBadge[];
  labels: { appleSmall: string; apple: string; googleSmall: string; google: string; comingSoon: string };
  className?: string;
}) {
  if (badges.length === 0) return null;
  return (
    <ul className={`nf-store-badges ${className ?? ""}`.trim()} data-testid="store-badges">
      {badges.map((badge) => {
        const name =
          badge.store === "ios" ? `${labels.appleSmall} ${labels.apple}` : `${labels.googleSmall} ${labels.google}`;
        const art =
          badge.store === "ios" ? (
            <AppleBadge small={labels.appleSmall} big={labels.apple} />
          ) : (
            <GoogleBadge small={labels.googleSmall} big={labels.google} />
          );
        return (
          <li key={badge.store}>
            {badge.href ? (
              <a href={badge.href} rel="noopener" className="nf-store-badge nf-m-press" aria-label={name}>
                {art}
              </a>
            ) : (
              <div className="nf-store-badge nf-store-badge--soon" role="group" aria-label={`${name}, ${labels.comingSoon}`}>
                {art}
                <span className="nf-store-badge__soon" aria-hidden="true">
                  {labels.comingSoon}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const BADGE_FONT = '-apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
const PLAY_FONT = '"Product Sans", "Google Sans", Roboto, "Helvetica Neue", Arial, sans-serif';

function AppleBadge({ small, big }: { small: string; big: string }) {
  return (
    <svg viewBox="0 0 119.66 40" width="119.66" height="40" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="118.66" height="39" rx="6.5" fill={BADGE.ink} stroke={BADGE.rim} />
      <g transform="translate(9.5 8) scale(1)" fill={BADGE.type}>
        <path
          transform="scale(0.98)"
          d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
        />
      </g>
      <text x="37" y="15.2" fill={BADGE.type} fontFamily={BADGE_FONT} fontSize="7.6" fontWeight="500">
        {small}
      </text>
      <text x="36.4" y="30.4" fill={BADGE.type} fontFamily={BADGE_FONT} fontSize="16.4" fontWeight="600" letterSpacing="-0.3">
        {big}
      </text>
    </svg>
  );
}

function GoogleBadge({ small, big }: { small: string; big: string }) {
  return (
    <svg viewBox="0 0 135 40" width="135" height="40" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="134" height="39" rx="5.5" fill={BADGE.ink} stroke={BADGE.rim} />
      {/* The play triangle in its four colours, meeting at one point. */}
      <g transform="translate(9.4 7.4) scale(1.08)" strokeLinejoin="round" strokeWidth="0.6">
        <path d="M1.2 1.1 12 12 1.2 22.9C.9 22.6.8 22.2.8 21.7V2.3c0-.5.1-.9.4-1.2Z" fill={BADGE.playBlue} stroke={BADGE.playBlue} />
        <path d="M1.2 1.1c.4-.4 1-.4 1.7 0l12.7 7.3L12 12Z" fill={BADGE.playGreen} stroke={BADGE.playGreen} />
        <path d="M1.2 22.9c.4.4 1 .4 1.7 0l12.7-7.3L12 12Z" fill={BADGE.playRed} stroke={BADGE.playRed} />
        <path d="m15.6 8.4 4.1 2.4c1.2.7 1.2 1.7 0 2.4l-4.1 2.4L12 12Z" fill={BADGE.playYellow} stroke={BADGE.playYellow} />
      </g>
      <text x="41" y="14.6" fill={BADGE.type} fontFamily={PLAY_FONT} fontSize="7.2" fontWeight="500" letterSpacing="0.5">
        {small}
      </text>
      <text x="40.6" y="30.2" fill={BADGE.type} fontFamily={PLAY_FONT} fontSize="16" fontWeight="500" letterSpacing="-0.2">
        {big}
      </text>
    </svg>
  );
}
