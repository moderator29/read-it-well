import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The link button (reference 55, kind 16): "View all", "Learn more". Brand
 * words with a trailing arrow and no box, the smallest action on a screen,
 * usually at the end of a section head. 44px tall for the finger; hover
 * underlines and nudges the arrow (`.nf-link-btn`, buttons.css).
 *
 * A link, because it goes somewhere. An action that stays on the page is a
 * `Button variant="quiet"` (the tertiary), which looks the same at rest.
 */
export type LinkButtonProps = Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  children: ReactNode;
  /** The trailing arrow. On by default, as the guide draws it. */
  arrow?: boolean;
};

export function LinkButton({ children, arrow = true, className, ...rest }: LinkButtonProps) {
  return (
    <Link {...rest} className={["nf-link-btn", className ?? ""].filter(Boolean).join(" ")}>
      <span>{children}</span>
      {arrow ? (
        <span className="nf-btn__arrow" aria-hidden="true">
          <UiIcon name="arrow-right" size={16} />
        </span>
      ) : null}
    </Link>
  );
}
