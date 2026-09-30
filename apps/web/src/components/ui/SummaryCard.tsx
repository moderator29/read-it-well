import type { ReactNode } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { StatusBar, type StatusSegment } from "./charts/StatusBar";

/**
 * THE SUMMARY CARD (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 9, reference 31's
 * "Needs you today"):
 *
 *   Label 13 muted                                   [badge]
 *   40px figure, tabular
 *   One sentence 14 secondary: what the figure means.
 *   [==== segment ====][== segment ==][= seg =]      6px, 4px gaps
 *   (dot) 3 high   (dot) 4 medium   (dot) 1 low      12px legend
 *
 * HONEST DATA. The figure prints only when the page can answer for it. A
 * numeric `figure` counts up once on first view (plan item 26, `CountUp`,
 * 600ms; the server prints the final number); a ReactNode figure prints as
 * given. With no figure (everything is zero), pass `empty` and the card says
 * that sentence instead ("Nothing needs you today.").
 *
 *   label, badge      the head row (badge: a `StatusBadge`)
 *   figure            number or node;  prefix / suffix ride outside the
 *                     digits ("N", "%");  tag  a BCP 47 tag for the digits
 *   sentence          one sentence under the figure
 *   segments          the bar's real parts (`StatusBar` segments); none, no bar
 *   barLabel          names the bar for a screen reader
 *   footer            a quiet link under the legend ("Breakdown")
 *   as                the element ("section" by default)
 *
 * Material: `.nf-summary` in `app/css/controls.css`. Server-safe (the
 * figure's count is a client leaf).
 */
export function SummaryCard({
  label,
  badge,
  figure,
  prefix,
  suffix,
  tag,
  sentence,
  empty,
  segments,
  barLabel,
  footer,
  className,
  as: Tag = "section",
}: {
  label: ReactNode;
  badge?: ReactNode;
  figure?: number | ReactNode;
  prefix?: string;
  suffix?: string;
  tag?: string;
  sentence?: ReactNode;
  empty?: ReactNode;
  segments?: StatusSegment[];
  barLabel?: string;
  footer?: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  const hasFigure = figure !== undefined && figure !== null;
  return (
    <Tag className={["nf-summary", className ?? ""].filter(Boolean).join(" ")}>
      <div className="nf-summary__head">
        <p className="nf-summary__label">{label}</p>
        {badge}
      </div>
      {hasFigure ? (
        <p className="nf-figure nf-summary__figure">
          {typeof figure === "number" ? (
            <CountUp value={figure} prefix={prefix} suffix={suffix} tag={tag} eager />
          ) : (
            figure
          )}
        </p>
      ) : null}
      {hasFigure && sentence != null ? <p className="nf-summary__sentence">{sentence}</p> : null}
      {!hasFigure && empty != null ? <p className="nf-summary__sentence">{empty}</p> : null}
      {hasFigure && segments && segments.length > 0 ? (
        <StatusBar segments={segments} label={barLabel ?? (typeof label === "string" ? label : "Breakdown")} />
      ) : null}
      {footer != null ? <div className="nf-summary__footer">{footer}</div> : null}
    </Tag>
  );
}
