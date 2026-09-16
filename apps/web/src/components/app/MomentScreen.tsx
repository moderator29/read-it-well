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
 *
 * ---------------------------------------------------------------------------
 * ON ITS WAY OUT. ONE CALL SITE LEFT, AND IT IS NOT IN THIS OWNER'S SCOPE.
 *
 * `components/app/ResultSheet.tsx` replaced this everywhere else. It is worth
 * restating why, because the reason is not tidiness. `MomentVariant` is
 * `success | brand | warning` with no failure state at all, and
 * `.nf-moment--warning` resolves through `--nf-state-warning` to
 * `--nf-cyan-400`, which is the same token `--nf-status-pending` is defined as.
 * So every failure this component was ever asked to draw came out in the colour
 * the product reserves for "still going through". It also renders inline at
 * `min-height: 60vh`, so on a long page the confirmation for the thing somebody
 * just did can sit below the fold, and a moment you scroll to is not a moment.
 *
 * `app/agent/list/ListingWizard.tsx` is the last caller. It is a straight swap
 * for `ResultScreen state="confirmed"`, which takes the same title, body and
 * two actions and needs no new copy; the exact replacement is written out in
 * the sprint report. This file and the `.nf-moment*` rules in `chips.css` go
 * with it. Nothing new should be pointed at this component.
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
        {/*
          `state="confirmed"` WAS A DEAD PROP AND IT IS GONE.

          `BrandIcon` applies `data-state` only in its tiled branch, and `tile`
          defaults to false, so the untiled branch returns before the attribute
          is ever written. The platform's confirmation component had been
          passing a prop that did nothing since it was added, and nothing caught
          it because `state` is optional on the receiving end.

          Removed rather than honoured: making `BrandIcon` apply `data-state` in
          both branches is the better fix and it belongs to whoever owns
          `design-system/icons`, not here. Passing a prop into the void while
          waiting for that is worse than not passing it, because it reads like a
          behaviour somebody can rely on.
        */}
        <BrandIcon name={icon ?? VARIANT_ICON[variant]} size={88} />
      </div>
      <h1 className="nf-moment__title">{title}</h1>
      {description ? <p className="nf-moment__description">{description}</p> : null}
      {actions ? <div className="nf-moment__actions">{actions}</div> : null}
      {footnote ? <div className="nf-moment__footnote">{footnote}</div> : null}
    </div>
  );
}
