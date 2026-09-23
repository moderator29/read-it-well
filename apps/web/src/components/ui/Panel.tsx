import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * THE PANEL: the platform's lit glass container, the console's anatomy
 * extracted for every surface (the wide platform sweep, 23 September).
 *
 * The material lives in `.nf-panel` (`app/css/glass.css`) on the tokens of
 * the "REFERENCE ANATOMY" block in `packages/design-tokens/src/tokens.css`:
 * the lit fill, the per-side edge, the catchlight under the top edge, the
 * hair of outer glow, the 10px container corner. This component owns only
 * the element and the modifiers; a surface adds its own layout through
 * `className` and never restates the material.
 *
 *   variant  "panel" (default) a region, a chart, a table;
 *            "card" the shorter object, whose top light runs longer
 *   flush    no side padding, for a table that runs edge to edge
 *   glass    adds the backdrop blur, for a panel floating over imagery
 *   as       the element ("section" by default; "div", "article", "li" ...)
 *
 * Server-safe: nothing here holds state.
 */
export type PanelVariant = "panel" | "card";

type PanelOwnProps<E extends ElementType> = {
  as?: E;
  variant?: PanelVariant;
  flush?: boolean;
  glass?: boolean;
  className?: string;
  children?: ReactNode;
};

export type PanelProps<E extends ElementType = "section"> = PanelOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof PanelOwnProps<E>>;

export function panelClass({
  variant = "panel",
  flush = false,
  glass = false,
  className,
}: Pick<PanelOwnProps<ElementType>, "variant" | "flush" | "glass" | "className">): string {
  return [
    "nf-panel",
    variant === "card" ? "nf-panel--card" : "",
    flush ? "nf-panel--flush" : "",
    glass ? "nf-panel--glass" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Panel<E extends ElementType = "section">({
  as,
  variant,
  flush,
  glass,
  className,
  children,
  ...rest
}: PanelProps<E>) {
  const Tag: ElementType = as ?? "section";
  return (
    <Tag {...rest} className={panelClass({ variant, flush, glass, className })}>
      {children}
    </Tag>
  );
}
