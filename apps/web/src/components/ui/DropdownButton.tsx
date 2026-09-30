"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The dropdown button (reference 55, kind 8): "Sort by" with a chevron. It
 * opens a list the caller owns (a Sheet on a phone, a menu on a desk), so it
 * states that with `aria-haspopup` and `aria-expanded`, and the chevron turns
 * while the list is open. White on the surface hairline (navy at night), brand
 * words; hover and open take the brand edge on the tint.
 *
 * The field's corner rather than the pill: it lives in filter rows beside
 * fields and chips (`.nf-btn--dropdown`, buttons.css). 44 or 48px tall.
 */
export type DropdownButtonProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  children: ReactNode;
  /** Whether the list it controls is open. */
  expanded?: boolean;
  /** What opens: a listbox by default, a menu, or a dialog (a sheet). */
  popup?: "listbox" | "menu" | "dialog";
  size?: "sm" | "md";
  full?: boolean;
  leadingIcon?: UiIconName;
};

export const DropdownButton = forwardRef(function DropdownButton(
  { children, expanded = false, popup = "listbox", size = "sm", full, leadingIcon, className, type, ...rest }: DropdownButtonProps,
  ref: Ref<HTMLButtonElement>,
) {
  const glyph = size === "sm" ? 16 : 20;
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? "button"}
      aria-haspopup={popup}
      aria-expanded={expanded}
      className={[
        "nf-btn nf-btn--dropdown",
        size === "sm" ? "nf-btn--sm" : "nf-btn--md",
        full ? "nf-btn--full" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {leadingIcon ? <UiIcon name={leadingIcon} size={glyph} /> : null}
      <span className="nf-btn__label">{children}</span>
      <span className="nf-btn__chevron" aria-hidden="true">
        <UiIcon name="chevron-down" size={glyph} />
      </span>
    </button>
  );
});
