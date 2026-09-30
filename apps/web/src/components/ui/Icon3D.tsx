import Image from "next/image";
import type React from "react";
import { icon3dSrc, type Icon3DName } from "./icon-3d";

/**
 * THE FOUNDER'S 3D ICONS (30 September): soft clay objects in royal blue with
 * one orange accent, sliced from his transparent sheet by
 * `scripts/brand-3d.mjs` into `public/brand/3d/` (real alpha, so they sit on
 * the warm paper as well as on the night glass).
 *
 *   stays    hotel, shortlet, restaurant, local-talks
 *   actions  buy, rent, pay, list
 *
 * Pictures, not glyphs: `UiIcon` stays the icon system for rows, chrome and
 * controls. Use these where a door or a category wants an object (the Home
 * quick actions, the Stays doors). The image is decorative by default
 * (`alt=""`), because a label always sits beside it; pass `label` only when
 * it stands alone.
 */
export { ICON_3D_NAMES, icon3dSrc, type Icon3DName } from "./icon-3d";

export function Icon3D({
  name,
  size = 48,
  label,
  className,
  priority,
}: {
  name: Icon3DName;
  /** The drawn size in CSS pixels (square). */
  size?: number;
  /** An accessible name, only when no visible label sits beside it. */
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={icon3dSrc(name)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={256}
      height={256}
      sizes={`${size}px`}
      /* The drawn size is a custom property, so a host can resize it in CSS
         (`.nf-icon3d` in app/css/brand-glass.css). */
      style={{ "--nf-icon3d-default": `${size}px` } as React.CSSProperties}
      className={["nf-icon3d", className ?? ""].filter(Boolean).join(" ")}
      draggable={false}
      {...(priority ? { priority: true } : {})}
    />
  );
}
