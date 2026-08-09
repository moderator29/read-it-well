import type { ReactNode } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

export type MomentVariant = "success" | "brand" | "warning";

const VARIANT_ICON: Record<MomentVariant, BrandIconName> = {
  success: "shield-check",
  brand: "gift-star",
  warning: "shield-lock",
};

/**
 * The one-thing-happened screen: a payment landed, a booking confirmed, a
 * verification passed. A glowing badge, a headline, and the actions that
 * follow, filling the surface rather than sitting inside a card.
 */
export function MomentScreen({
  variant = "success",
  icon,
  title,
  description,
  actions,
  footnote,
  className,
}: {
  variant?: MomentVariant;
  /** Overrides the variant's default badge glyph. */
  icon?: BrandIconName;
  title: string;
  description?: string;
  actions?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`nf-moment nf-moment--${variant} ${className ?? ""}`}>
      <div className="nf-moment__glow" aria-hidden="true" />
      <div className="nf-moment__badge">
        <BrandIcon name={icon ?? VARIANT_ICON[variant]} size={88} state="confirmed" />
      </div>
      <h1 className="nf-moment__title">{title}</h1>
      {description ? <p className="nf-moment__description">{description}</p> : null}
      {actions ? <div className="nf-moment__actions">{actions}</div> : null}
      {footnote ? <div className="nf-moment__footnote">{footnote}</div> : null}
    </div>
  );
}
