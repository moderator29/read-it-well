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
 */
export type StatusBadgeTone = "success" | "pending" | "error" | "info" | "neutral";
export type StatusBadgeSize = "sm" | "md";

export function statusBadgeClass({
  tone,
  size = "sm",
  className,
}: {
  tone: StatusBadgeTone;
  size?: StatusBadgeSize;
  className?: string;
}): string {
  return ["nf-badge", `nf-badge--${tone}`, size === "md" ? "nf-badge--md" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

export function StatusBadge({
  tone,
  size,
  live = false,
  className,
  children,
}: {
  tone: StatusBadgeTone;
  size?: StatusBadgeSize;
  live?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  /* `createElement` rather than JSX so the unit suite, which aliases React to
     its server entry, can render it. */
  return createElement(
    "span",
    { role: live ? "status" : undefined, className: statusBadgeClass({ tone, size, className }) },
    children,
  );
}
