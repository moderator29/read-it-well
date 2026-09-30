import { createElement, type ReactNode } from "react";

/**
 * THE STATUS BADGE: the platform's one status mark, the console's filled
 * badge extracted for every surface (the wide platform sweep's leftovers,
 * SW-C6, 23 September).
 *
 * The material lives in `.nf-badge` (`app/css/chips.css`): a tinted glass
 * fill of the tone's own hue over the canvas, a ring of the same hue, the lit
 * edge under the top and the word in the hue lifted towards white. It is a
 * rounded rectangle on `--nf-radius-xs` (the shape law is a ratio: 6px on a
 * 20 to 26px badge is 0.23 to 0.30, never a capsule) with an 11px floor on
 * the type. This component owns only the element, the tone and the size; a
 * surface adds position through `className` and never restates the material.
 *
 *   tone   success (emerald), pending (cyan), error (rose), info (the brand
 *          fill with the cyan word), neutral
 *   size   "sm" (default, about 22px) or "md" (the console's 24px row badge)
 *   live   announces an in-place change (a payment settling)
 *
 * Server-safe: nothing here holds state.
 *
 * FOUR KINDS (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 6). The material is flat
 * now: a tint of the hue and its ink, no ring, no lit edge, no halo.
 *
 *   kind   "badge" (default) a 12/600 word on the tint, 22px, 6px corner:
 *          "Live", "Draft", "To rent"
 *          "dot"    the badge with a 6px dot before the word:
 *                   "Unpublished changes", "Needs more from you"
 *          "status" a 6px dot and a 13px word with NO fill, for a row's
 *                   trailing slot: "High", "Paid", "Awaiting reply"
 *          "count"  a tabular number on the brand tint, at least 20 by 20:
 *                   an unread "2" (the tone is ignored)
 *
 * Tones: success, pending (alias warning), error (alias danger), info,
 * brand, neutral, and example (the `isDemo` disclosure: the neutral fill,
 * the word "Example", never "demo" or "sample").
 */
export type StatusBadgeTone =
  | "success"
  | "pending"
  | "warning"
  | "error"
  | "danger"
  | "info"
  | "brand"
  | "neutral"
  | "example";
export type StatusBadgeSize = "sm" | "md";
export type StatusBadgeKind = "badge" | "dot" | "status" | "count";

export function statusBadgeClass({
  tone = "neutral",
  size = "sm",
  kind = "badge",
  className,
}: {
  tone?: StatusBadgeTone;
  size?: StatusBadgeSize;
  kind?: StatusBadgeKind;
  className?: string;
}): string {
  if (kind === "status") {
    return ["nf-status-dot", `nf-badge--${tone}`, className ?? ""].filter(Boolean).join(" ");
  }
  if (kind === "count") {
    return ["nf-badge", "nf-badge--count", className ?? ""].filter(Boolean).join(" ");
  }
  return [
    "nf-badge",
    `nf-badge--${tone}`,
    kind === "dot" ? "nf-badge--dot" : "",
    size === "md" ? "nf-badge--md" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function StatusBadge({
  tone,
  size,
  kind,
  live = false,
  className,
  children,
}: {
  /** Required for every kind but `count`. */
  tone?: StatusBadgeTone;
  size?: StatusBadgeSize;
  kind?: StatusBadgeKind;
  live?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  /* `createElement` rather than JSX so the unit suite, which aliases React to
     its server entry, can render it. */
  return createElement(
    "span",
    { role: live ? "status" : undefined, className: statusBadgeClass({ tone, size, kind, className }) },
    children,
  );
}
