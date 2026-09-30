"use client";

import { forwardRef } from "react";
import type { Ref } from "react";
import { Button, type ButtonProps } from "./Button";
import type { UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The floating action button (reference 55, kind 5): a 56px blue circle
 * holding one glyph, for the one primary action of a focused context (add a
 * listing on the desk, start a new thread). It is the primary `Button`
 * drawn round (`.nf-btn--fab`, buttons.css), so it shares the press, the
 * hover, the focus ring and the disabled grey with every other primary.
 *
 * `aria-label` is required: the circle carries no word. Placement is the
 * caller's; a page that floats it keeps it clear of the dock.
 */
export type FabProps = Omit<ButtonProps, "variant" | "size" | "iconOnly" | "leadingIcon" | "children" | "aria-label"> & {
  "aria-label": string;
  /** The glyph. Defaults to the plus. */
  icon?: UiIconName;
};

export const Fab = forwardRef(function Fab(
  { icon = "plus", className, ...rest }: FabProps,
  ref: Ref<HTMLButtonElement>,
) {
  return (
    <Button
      {...rest}
      ref={ref}
      variant="primary"
      size="lg"
      iconOnly
      leadingIcon={icon}
      className={["nf-btn--fab", className ?? ""].filter(Boolean).join(" ")}
    />
  );
});
