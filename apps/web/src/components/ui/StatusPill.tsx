import type { CSSProperties, ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The status pill. One vocabulary, for the whole platform.
 *
 * There were four competing implementations - `admin/_components/ui.tsx`'s
 * `statusTone`, `ListingsWorkspace`'s `toneStyle`, `BookingsWorkspace`'s
 * `statusBadgeClass`, and a scatter of inline objects on the dashboards. They
 * disagreed on which colour a status is: the same PENDING booking was amber in
 * one surface and neutral in another, and an operator moving between the two
 * screens had to re-learn the colours each time. A status colour is a claim
 * about severity; four different claims means none of them can be trusted.
 *
 * They also disagreed on whether a pill is visible at all. `.nf-badge` defines
 * layout, size and weight but no background and no colour, so
 * `class="nf-badge"` used bare - which is exactly what the CANCELLED branch of
 * `statusBadgeClass` returned - painted current text colour on no fill: an
 * invisible pill where a cancellation notice should be.
 *
 * So the paint here is an inline style, not a modifier class. A `StatusPill`
 * with no className renders visibly by construction; there is no way to reach
 * the old failure by forgetting a modifier, because there is no modifier to
 * forget. It also means the tones need no new rules in globals.css.
 */

export type StatusTone = "success" | "warning" | "danger" | "info" | "brand" | "neutral";

/**
 * Tinted fill, saturated text, no border. The fills are the shared
 * `--nf-state-*-surface` tokens, so a tone change happens once for everything.
 *
 * `neutral` is a wash of the content colour rather than a surface token, so it
 * reads as "no state" on any of the four surface families without carrying a
 * panel colour into a card that is already that colour.
 */
const TONE_STYLE: Record<StatusTone, CSSProperties> = {
  success: { background: "var(--nf-state-success-surface)", color: "var(--nf-state-success)" },
  warning: { background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" },
  danger: { background: "var(--nf-state-error-surface)", color: "var(--nf-state-error)" },
  info: { background: "var(--nf-state-info-surface)", color: "var(--nf-state-info)" },
  brand: {
    background: "color-mix(in oklab, var(--nf-brand-primary) 20%, transparent)",
    color: "var(--nf-brand-secondary)",
  },
  neutral: {
    background: "color-mix(in oklab, var(--nf-content-primary) 10%, transparent)",
    color: "var(--nf-content-secondary)",
  },
};

const SIZE_CLASS = {
  xs: "px-xs py-3xs text-[var(--nf-text-overline)]",
  sm: "px-sm py-2xs text-[var(--nf-text-caption)]",
} as const;

const ICON_PX = { xs: 11, sm: 13 } as const;

/**
 * THE MARK, AND IT WAS THE SAME DOT SIX TIMES UNDER A DOCSTRING THAT CLAIMED
 * OTHERWISE.
 *
 * The comment on the `icon` prop said "every pill still carries a non-colour
 * mark and a colour-blind reader is never left with hue as the only signal".
 * The mark was `rounded-full bg-current` in all six tones. `bg-current` is the
 * tone's own colour, so in greyscale the six pills carried six identical grey
 * dots and the only thing separating them was the word - which is fine, and is
 * what the label is for, but it means the dot was decoration presenting itself
 * as an accessibility control. A claim like that in a docstring is worse than
 * no claim, because the next person reads it and stops checking.
 *
 * Six shapes now, each drawn from one 8 or 10 pixel box:
 *
 *   success   filled circle    the closed, finished shape
 *   warning   hollow circle    open, because it is waiting on somebody
 *   info      diamond          turned, because it is in motion
 *   danger    filled square    the hardest, heaviest shape in the set
 *   brand     hollow square    danger's shape, open
 *   neutral   bar              no state at all, so the least shape there is
 *
 * They are told apart at 8px in greyscale on the pairing that matters most,
 * filled against hollow and round against square, rather than on fine detail. A
 * cross or an hourglass would say more and would be mush at this size; the
 * constraint is what the set is built around.
 *
 * The marks grew from 6 and 8 pixels to 8 and 10. A shape has to be big enough
 * to BE a shape, and at 6px a ring and a dot are the same smudge, which would
 * have left the docstring's claim just as untrue in a more elaborate way.
 *
 * The diamond is a `clipPath` rather than a rotation on purpose: rotating a
 * square by 45 degrees grows its bounding box by a factor of root two, so an
 * 8px mark would reserve 11.3px and the info pill alone would sit a little
 * wider than its five siblings.
 *
 * WARNING'S MARK CARRIES ITS OWN INK, `--nf-state-warning-accent`, where the
 * other five ride `currentColor`. On paper the warning ink is stepped down to a
 * deep teal so that the WORD clears 4.5:1 on white, which is right and is not
 * in question; the consequence was that pending - the state that most needs to
 * be noticed - became the flattest thing on a light screen, mark and fill
 * included. A mark is not small bold text. See the note beside the token.
 */
const MARK_CLASS = { xs: "size-2", sm: "size-2.5" } as const;

const TONE_MARK: Record<StatusTone, CSSProperties> = {
  success: { background: "currentColor", borderRadius: "var(--nf-radius-circle)" },
  warning: {
    border: "var(--nf-border-width-strong) solid var(--nf-state-warning-accent)",
    borderRadius: "var(--nf-radius-circle)",
  },
  info: { background: "currentColor", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  danger: { background: "currentColor", borderRadius: "var(--nf-radius-xs)" },
  brand: {
    border: "var(--nf-border-width-strong) solid currentColor",
    borderRadius: "var(--nf-radius-xs)",
  },
  neutral: { background: "currentColor", height: "2px", borderRadius: "var(--nf-radius-pill)" },
};

export type StatusPillProps = {
  tone: StatusTone;
  /**
   * A tier-one glyph. Optional, and there is deliberately no per-tone default
   * glyph: the functional icon set has no check, clock, alert or info mark, and
   * inventing four here would fork the icon vocabulary at the exact point the
   * status vocabulary is being unified. Where no glyph is given the pill leads
   * with the tone's own MARK instead - a different shape per tone, not a
   * different colour - so a reader who cannot separate the hues still has
   * something to separate, and it survives greyscale. See `TONE_MARK`.
   */
  icon?: UiIconName;
  size?: "xs" | "sm";
  /**
   * Announces changes to assistive technology as they happen. For a pill whose
   * value updates in place - a payment settling, a booking being accepted -
   * where a silent swap would otherwise go unnoticed.
   */
  live?: boolean;
  className?: string;
  children: ReactNode;
};

export function StatusPill({
  tone,
  icon,
  size = "xs",
  live = false,
  className,
  children,
}: StatusPillProps) {
  return (
    <span
      role={live ? "status" : undefined}
      className={["nf-badge", SIZE_CLASS[size], className ?? ""].filter(Boolean).join(" ")}
      style={TONE_STYLE[tone]}
    >
      {icon ? (
        <UiIcon name={icon} size={ICON_PX[size]} />
      ) : (
        <span
          aria-hidden="true"
          className={`${MARK_CLASS[size]} shrink-0`}
          /* `boxSizing` so the hollow shapes keep the same outer size as the
             filled ones; a 1.5px border would otherwise make the ring and the
             hollow square 3px wider than their five siblings. */
          style={{ boxSizing: "border-box", ...TONE_MARK[tone] }}
        />
      )}
      {children}
    </span>
  );
}

/**
 * The single status → tone mapping.
 *
 * Every status string the platform produces is routed here: booking statuses,
 * wallet and transaction statuses, listing lifecycle statuses, and the admin
 * queue's application statuses - which arrive lowercase from one query and
 * uppercase from another, hence the normalisation. Three of the four old maps
 * covered only their own slice, which is how the same word ended up with
 * different colours on adjacent screens.
 *
 * The severity rule, so new statuses have an obvious home:
 *   success - the terminal good outcome, money settled, thing live
 *   warning - waiting on someone, reversible, no action failed yet
 *   info    - in motion, being worked, nothing is owed by the user
 *   danger  - failed, refused or withdrawn; someone lost something
 *   neutral - a state with no severity at all, including drafts
 *
 * An unknown status falls to `neutral` rather than throwing: a queue must not
 * blank out because the database gained an enum value before the UI did.
 */
export function toneForStatus(status: string): StatusTone {
  switch (status.trim().toUpperCase()) {
    case "CONFIRMED":
    case "COMPLETED":
    case "SUCCESSFUL":
    case "APPROVED":
    case "PUBLISHED":
    case "RESOLVED":
    case "REVIEWED":
    case "ACTIVE":
    case "PAID":
      return "success";

    case "PENDING":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "OPEN":
    case "AWAITING_PAYMENT":
      return "warning";

    case "REVIEWING":
    case "IN_PROGRESS":
    case "PROCESSING":
    case "MORE_INFO_REQUIRED":
      return "info";

    case "CANCELLED":
    case "FAILED":
    case "REJECTED":
    case "SUSPENDED":
    case "REVERSED":
    case "REFUNDED":
    case "EXPIRED":
      return "danger";

    /*
     * NO_SHOW IS WRITTEN DOWN RATHER THAN LEFT TO THE DEFAULT, and the tone it
     * lands on is unchanged by saying so.
     *
     * It is a live booking status and it was falling through to `default`,
     * which returns `neutral` - the right answer, arrived at by accident. A
     * guest who never arrived is not a system failure, so it is not rose, and
     * it is plainly not a good outcome, so it is not emerald. Neutral is
     * correct and now it is a DECISION rather than the absence of one.
     *
     * The distinction is the whole point of this map. A fall-through is
     * indistinguishable from "nobody has looked at this status yet", so the
     * next person cannot tell a considered neutral from an unconsidered one,
     * and eleven live enum values reached that default the same way - three of
     * them meaning something bad, which neutral does not say.
     *
     * `default` stays, and stays `neutral`, because a queue must not blank out
     * when the database gains an enum value before the UI does. It is a safety
     * net, not a decision, and nothing should be resting on it on purpose.
     */
    case "NO_SHOW":
    case "DRAFT":
    case "ARCHIVED":
      return "neutral";

    default:
      return "neutral";
  }
}
