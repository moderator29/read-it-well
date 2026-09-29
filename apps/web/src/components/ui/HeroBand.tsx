import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

/**
 * THE HERO BAND: the light theme's one signature moment, a navy block at the
 * top of a screen that opens a world or carries a headline number
 * (`docs/design/CLEAN_UNIFIED_DIRECTION.md` section 16, Q2 as the founder
 * widened it on 29 September 2026).
 *
 * The material is `.nf-hero-band` (`app/css/controls.css` for the night,
 * `app/css/light.css` for paper). It is always a night island
 * (`data-theme="dark"`), so everything inside it takes the night palette:
 * white type, mist sub-lines, and the brand blue only on the one action it
 * holds (a primary `Button`). In light it is the navy block on the warm
 * canvas; at night it is a raised night surface on the card hairline. The
 * same radius and inner spacing everywhere; no glass, no photograph behind
 * it (a screen whose hero is a photograph keeps its own).
 *
 * Where it goes: Home, the host and agent workspace home (the KPI row sits
 * on it), the profile and trust hero, money and earnings summaries, the
 * booking, stay and agreement live-status headers, success moments. Never on
 * settings, search results, the inbox, threads, forms or admin tables.
 *
 *   label    optional section label above the title (sentence case string;
 *            the class sets it in caps)
 *   title    the headline or the figure's name
 *   sub      one muted sentence under the title
 *   action   the one action (usually a primary `Button`), placed top right
 *            from a tablet up and under the text on a phone
 *   children anything below the head: a figure, a KPI row, a stepper
 *   as       the element ("section" by default)
 *
 * Server-safe: nothing here holds state.
 */
type HeroBandOwnProps<E extends ElementType> = {
  as?: E;
  label?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export type HeroBandProps<E extends ElementType = "section"> = HeroBandOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof HeroBandOwnProps<E>>;

export function HeroBand<E extends ElementType = "section">({
  as,
  label,
  title,
  sub,
  action,
  className,
  children,
  ...rest
}: HeroBandProps<E>) {
  const Tag: ElementType = as ?? "section";
  const hasHead = label != null || title != null || sub != null || action != null;
  return (
    <Tag {...rest} data-theme="dark" className={["nf-hero-band", className ?? ""].filter(Boolean).join(" ")}>
      {hasHead ? (
        <div className="nf-hero-band__head">
          <div className="nf-hero-band__text">
            {label != null ? <p className="nf-section-label nf-hero-band__label">{label}</p> : null}
            {title != null ? <h2 className="nf-hero-band__title">{title}</h2> : null}
            {sub != null ? <p className="nf-hero-band__sub">{sub}</p> : null}
          </div>
          {action != null ? <div className="nf-hero-band__action">{action}</div> : null}
        </div>
      ) : null}
      {children != null ? <div className="nf-hero-band__body">{children}</div> : null}
    </Tag>
  );
}
