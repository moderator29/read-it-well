import type { ReactNode } from "react";

/**
 * THE ICON PLATE, VERSION 2 (29 September 2026): a lean line glyph on a soft
 * tinted square, the object references 30, 31 and 38 under
 * `docs/design/references/2026-09-29/` repeat on every row and card. The
 * spec is `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 4.
 *
 * The material lives in `.nf-plate` (`app/css/symbols.css`, "THE ICON
 * PLATE"): flat, no rim, no inner light, no glow, in either theme. At night a
 * plate is a slightly lighter surface than the card under it; in daylight it
 * is the raised paper well. A plate is a shape and carries no text; pass the
 * glyph as the child (a `UiIcon`), sized `ICON_PLATE_GLYPH[size]`.
 *
 *   size  "sm" 36px on a 10px corner (a row), "md" 44px on 12 (a card head,
 *         a KPI tile), "lg" 56px on 14 (a state, a confirmation)
 *   tone  "neutral" (default): most plates on a screen. "brand": rationed to
 *         the one row that is the point of the screen. "success" | "warning"
 *         | "danger" | "info": a state, tinted in the state's own hue.
 *         "solid": an ink square with the glyph reversed out (a done step, an
 *         external system), as reference 30's "Check order" tile.
 *
 *   shape "square" (default): the utility plate, settings-style rows.
 *         "round": the circle of founder reference 44's rating list
 *         (CLEAN_UNIFIED_DIRECTION.md section 17). CONTENT rows take it,
 *         tinted: notifications, stats, categories, rankings. Settings and
 *         other utility rows keep the neutral square.
 *
 * "error" and "pending" are the old names of "danger" and "warning" and
 * resolve to them.
 *
 * Decorative by default (`aria-hidden`): the words beside it carry the
 * meaning. Server-safe.
 */
export type IconPlateSize = "sm" | "md" | "lg";
export type IconPlateShape = "square" | "round";
export type IconPlateTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "solid"
  /** @deprecated the old name of "danger" */
  | "error"
  /** @deprecated the old name of "warning" */
  | "pending";

/** The glyph edge for each plate: 20 in a row or card plate, 24 in the hero plate. */
export const ICON_PLATE_GLYPH: Record<IconPlateSize, 20 | 24> = { sm: 20, md: 20, lg: 24 };

const TONE_ALIAS: Partial<Record<IconPlateTone, IconPlateTone>> = { error: "danger", pending: "warning" };

export function iconPlateClass({
  size = "md",
  tone = "neutral",
  shape = "square",
  className,
}: {
  size?: IconPlateSize;
  tone?: IconPlateTone;
  shape?: IconPlateShape;
  className?: string;
}): string {
  const resolved = TONE_ALIAS[tone] ?? tone;
  return [
    "nf-plate",
    `nf-plate--${resolved}`,
    `nf-plate--${size}`,
    shape === "round" ? "nf-plate--round" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function IconPlate({
  size = "md",
  tone = "neutral",
  shape = "square",
  className,
  children,
}: {
  size?: IconPlateSize;
  tone?: IconPlateTone;
  shape?: IconPlateShape;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={iconPlateClass({ size, tone, shape, className })} aria-hidden="true">
      {children}
    </span>
  );
}
