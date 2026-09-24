import "@/app/css/trust-badge.css";
import { BADGE_TIER_MEANING, type BadgeTier } from "@/lib/trust/badge-tier";

/**
 * THE ONE PLACE EITHER BADGE IS DRAWN.
 *
 * Every surface that draws a person's name renders this and nothing else. That
 * is not tidiness, it is the whole defect this component exists to prevent: the
 * moment a second surface decides for itself what a tier looks like, or when to
 * draw one, we are back to a reader seeing a tick in a message thread and no
 * tick on the listing behind it with no way to tell which screen is lying.
 *
 * WHERE THE TRUTH COMES FROM, AND IT IS NOT THIS FILE. `tier` is the published
 * value of `public.person_badge.tier`, or of `public.agent_badges.tier` which
 * is the same answer on the row a listing already joins. Both are computed by
 * `public.badge_tier(is_staff, is_checked)` in migration `20260923111950`:
 *
 *   gold      `public.is_checked_person`, which reads only
 *             `agent_badges.verified` and `businesses.verified`. Both are
 *             derived by trigger from their own ladders and constrained, so
 *             neither can be true without a rung a named member of staff
 *             passed. Gold is earned at a check and never at an approval.
 *   platinum  `public.is_platform_staff`, which is `private.has_role` over
 *             `public.user_roles`. A platform administrator.
 *
 * Platinum beats gold when somebody holds both, and that precedence is decided
 * in the database rather than here, so this component never has to choose and
 * no other component can choose differently.
 *
 * `tier` IS REQUIRED AND HAS NO DEFAULT, for the reason `VerifiedAvatar` gives
 * about its own prop: a call site that has not resolved the real badge cannot
 * render this at all, it will not compile, and a mark that appears because
 * somebody forgot a prop is worse than no mark anywhere.
 *
 * WHAT IT DRAWS, AND WHERE THAT CAME FROM. An eight lobed scalloped seal with a
 * tick knocked through it, taken off the founder's own artwork by measurement
 * rather than by eye: the gold and platinum sources in
 * `docs/design/references/trust-badges/`, added in `cb7deb07`.
 * The lobe count, the 0.819 inner to outer radius ratio, the gradient stops and
 * the tick's three points are all sampled values, recorded in
 * `app/css/trust-badge.css`. The images govern the FORM. They govern nothing
 * about who gets a badge.
 *
 * It is `aria-hidden` when a label sits beside it and carries its meaning as a
 * `role="img"` otherwise, so a screen reader hears the fact once rather than
 * twice or not at all.
 */

/*
 * The seal, generated from the measured polar form r(t) = 10.0 + 1.0 cos(8t)
 * on a 24 grid, sampled at 32 points and closed with a Catmull-Rom spline. It
 * is a constant because a path recomputed at render time is a path that can
 * drift between two screens.
 */
const SEAL =
  "M12 1C12.65 1 13.38 1.74 13.95 2.19C14.53 2.64 14.85 3.43 15.45 3.68C16.05 3.93 16.84 3.59 17.56 3.68C18.28 3.77 19.32 3.76 19.78 4.22C20.24 4.68 20.23 5.72 20.32 6.44C20.41 7.16 20.07 7.95 20.32 8.55C20.57 9.15 21.36 9.47 21.81 10.05C22.26 10.62 23 11.35 23 12C23 12.65 22.26 13.38 21.81 13.95C21.36 14.53 20.57 14.85 20.32 15.45C20.07 16.05 20.41 16.84 20.32 17.56C20.23 18.28 20.24 19.32 19.78 19.78C19.32 20.24 18.28 20.23 17.56 20.32C16.84 20.41 16.05 20.07 15.45 20.32C14.85 20.57 14.53 21.36 13.95 21.81C13.38 22.26 12.65 23 12 23C11.35 23 10.62 22.26 10.05 21.81C9.47 21.36 9.15 20.57 8.55 20.32C7.95 20.07 7.16 20.41 6.44 20.32C5.72 20.23 4.68 20.24 4.22 19.78C3.76 19.32 3.77 18.28 3.68 17.56C3.59 16.84 3.93 16.05 3.68 15.45C3.43 14.85 2.64 14.53 2.19 13.95C1.74 13.38 1 12.65 1 12C1 11.35 1.74 10.62 2.19 10.05C2.64 9.47 3.43 9.15 3.68 8.55C3.93 7.95 3.59 7.16 3.68 6.44C3.77 5.72 3.76 4.68 4.22 4.22C4.68 3.76 5.72 3.77 6.44 3.68C7.16 3.59 7.95 3.93 8.55 3.68C9.15 3.43 9.47 2.64 10.05 2.19C10.62 1.74 11.35 1 12 1Z";

/* The tick's centreline, from the measured arm ends and vertex on the 24 grid. */
const TICK = "M7 13.1 10.5 16.4 17 9.2";

const PAINT: Record<
  Exclude<BadgeTier, "none">,
  { top: string; mid: string; foot: string; tickTop: string; tickFoot: string }
> = {
  gold: {
    top: "var(--nf-badge-gold-top)",
    mid: "var(--nf-badge-gold-mid)",
    foot: "var(--nf-badge-gold-foot)",
    tickTop: "var(--nf-badge-gold-tick-top)",
    tickFoot: "var(--nf-badge-gold-tick-foot)",
  },
  platinum: {
    top: "var(--nf-badge-platinum-top)",
    mid: "var(--nf-badge-platinum-mid)",
    foot: "var(--nf-badge-platinum-foot)",
    tickTop: "var(--nf-badge-platinum-tick-top)",
    tickFoot: "var(--nf-badge-platinum-tick-foot)",
  },
};

export function TierBadge({
  tier,
  size = 16,
  className,
  /** Pass true when a text label already carries the meaning beside the mark. */
  decorative = false,
}: {
  tier: BadgeTier;
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  /* No tier, no mark, and no empty box where a mark would have been. */
  if (tier === "none") return null;

  const paint = PAINT[tier];
  const meaning = BADGE_TIER_MEANING[tier];
  /* The gradient ids must not collide when two marks are on one screen. */
  const id = `nf-tier-${tier}`;

  return (
    <span
      className={className ? `nf-tier-badge ${className}` : "nf-tier-badge"}
      style={{ width: size, height: size }}
      {...(decorative
        ? { "aria-hidden": true as const }
        : { role: "img" as const, "aria-label": meaning, title: meaning })}
      data-testid="tier-badge"
      data-tier={tier}
    >
      <svg
        className="nf-tier-badge__seal"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-body`} x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={paint.top} />
            <stop offset="0.5" stopColor={paint.mid} />
            <stop offset="1" stopColor={paint.foot} />
          </linearGradient>
          <linearGradient id={`${id}-tick`} x1="7" y1="16.4" x2="17" y2="9.2" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={paint.tickFoot} />
            <stop offset="1" stopColor={paint.tickTop} />
          </linearGradient>
        </defs>
        <path d={SEAL} fill={`url(#${id}-body)`} />
        <path
          d={TICK}
          fill="none"
          stroke={`url(#${id}-tick)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
