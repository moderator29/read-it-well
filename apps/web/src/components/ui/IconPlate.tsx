import type { ReactNode } from "react";

/**
 * THE ICON PLATE: the inner plate behind a line glyph, the console's icon
 * tile extracted for every surface (the wide platform sweep, 23 September).
 *
 * The material lives in `.nf-plate` (`app/css/controls.css`) on the tokens of
 * the "REFERENCE ANATOMY" block in `packages/design-tokens/src/tokens.css`:
 * the lit blue glass fill, the rim and inner light, the per-side edges, the
 * plate's own glow and the glyph's. A plate is a shape and carries no text;
 * pass the glyph as the child (a `UiIcon`, or a surface's own line glyph),
 * sized 16 on `sm` and 24 on `md` and `lg`.
 *
 *   size  "sm" 36px (a list row), "md" 44px (a card, a figure), "lg" 56px
 *   tone  "brand" the lit glass (default); "success" | "error" | "pending" |
 *         "info" swap in the state's own deep fill
 *
 * Decorative by default (`aria-hidden`): the words beside it carry the
 * meaning. Server-safe.
 */
export type IconPlateSize = "sm" | "md" | "lg";
export type IconPlateTone = "brand" | "success" | "error" | "pending" | "info";

export const ICON_PLATE_GLYPH: Record<IconPlateSize, 16 | 24> = { sm: 16, md: 24, lg: 24 };

export function iconPlateClass({
  size = "md",
  tone = "brand",
  className,
}: {
  size?: IconPlateSize;
  tone?: IconPlateTone;
  className?: string;
}): string {
  return ["nf-plate", `nf-plate--${tone}`, `nf-plate--${size}`, className ?? ""].filter(Boolean).join(" ");
}

export function IconPlate({
  size = "md",
  tone = "brand",
  className,
  children,
}: {
  size?: IconPlateSize;
  tone?: IconPlateTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={iconPlateClass({ size, tone, className })} aria-hidden="true">
      {children}
    </span>
  );
}
