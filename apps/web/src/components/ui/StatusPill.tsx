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
    color: "var(--nf-electric-300)",
  },
  neutral: {
    background: "color-mix(in oklab, var(--nf-content-primary) 10%, transparent)",
    color: "var(--nf-content-secondary)",
  },
};

const SIZE_CLASS = {
  xs: "px-2 py-0.5 text-[var(--nf-text-overline)]",
  sm: "px-2.5 py-1 text-[var(--nf-text-caption)]",
} as const;

const ICON_PX = { xs: 11, sm: 13 } as const;
const DOT_CLASS = { xs: "size-1.5", sm: "size-2" } as const;

export type StatusPillProps = {
  tone: StatusTone;
  /**
   * A tier-one glyph. Optional, and there is deliberately no per-tone default
   * glyph: the functional icon set has no check, clock, alert or info mark, and
   * inventing four here would fork the icon vocabulary at the exact point the
   * status vocabulary is being unified. Where no glyph is given the pill leads
   * with a tone dot instead, so every pill still carries a non-colour mark and
   * a colour-blind reader is never left with hue as the only signal.
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
        <UiIcon name={icon} size={ICON_PX[size]} strokeWidth={2.1} />
      ) : (
        <span aria-hidden="true" className={`${DOT_CLASS[size]} shrink-0 rounded-full bg-current`} />
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

    case "DRAFT":
    case "ARCHIVED":
      return "neutral";

    default:
      return "neutral";
  }
}
