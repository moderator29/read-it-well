import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE KPI TILE (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 13, reference 38):
 *
 *   [glyph 14] LABEL (11 caps muted)          [->]
 *   28  open (13 muted)
 *   [up 12%] vs last 30 days (12 muted)
 *
 * A TILE IS A DOOR: with `href` the whole tile links to the filtered list,
 * and the corner arrow says so.
 *
 * THE DELTA CHIP PRINTS ONLY WHEN THE SAME QUERY ANSWERED FOR THE PREVIOUS
 * PERIOD. Pass `previous` only then. No previous period (a new desk, a new
 * metric), no chip; never a made-up trend. Direction is a lean arrow plus the
 * word ("up", "down", "same"), never colour alone. A zero figure still shows
 * (0 is true); a previous of 0 prints the change as a count, not a
 * percentage it cannot have.
 *
 *   label          the metric ("Requests waiting")
 *   icon           a 16px lean glyph before the label
 *   value          the figure (counts up once on first view, plan item 26)
 *   unit           a muted word after the figure ("open")
 *   previous       the same figure for the previous period, when known
 *   periodLabel    what `previous` was ("vs last 30 days")
 *   upIsGood       false for a metric where more is worse (late replies):
 *                  flips the chip's tint, never its arrow
 *   words          the direction words, in the reader's language
 *   href           the filtered list;  tag  a BCP 47 tag for the digits
 *
 *   sub            a quiet sub-line under the figure when there is no
 *                  delta ("in 3 listings"); never a trend
 *
 * SECTION 17 (founder reference 45's 2x2 tiles): the label reads in
 * sentence case at row size with a chevron at its right when the tile is a
 * door, the figure is big, and a small coloured delta or a quiet sub-line
 * sits under it. Lay four out with `.nf-figure-tiles` (two by two on a
 * phone, a row of four from 1024px).
 *
 * Material: `.nf-kpi` in `app/css/controls.css`, section 17 in
 * `app/css/clean-17.css`. Server-safe.
 */
export function KpiTile({
  label,
  icon,
  value,
  unit,
  previous,
  periodLabel,
  upIsGood = true,
  words = { up: "up", down: "down", same: "no change" },
  href,
  tag = "en-NG",
  linkLabel,
  sub,
  className,
}: {
  label: string;
  icon?: UiIconName;
  value: number;
  unit?: ReactNode;
  previous?: number;
  periodLabel?: ReactNode;
  upIsGood?: boolean;
  words?: { up: string; down: string; same: string };
  href?: string;
  tag?: string;
  /** Accessible name of the door; defaults to the label. */
  linkLabel?: string;
  /** A quiet line under the figure, shown only when there is no delta. */
  sub?: ReactNode;
  className?: string;
}) {
  let delta: ReactNode = null;
  if (typeof previous === "number" && Number.isFinite(previous)) {
    const diff = value - previous;
    const dir = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    const good = dir === "same" ? null : (dir === "up") === upIsGood;
    const amount =
      previous > 0
        ? `${Math.round((Math.abs(diff) / previous) * 100)}%`
        : new Intl.NumberFormat(tag).format(Math.abs(diff));
    delta = (
      <p className="nf-kpi__delta">
        <span
          className={[
            "nf-badge",
            good === null ? "nf-badge--neutral" : good ? "nf-badge--success" : "nf-badge--error",
          ].join(" ")}
        >
          {dir !== "same" ? <UiIcon name={dir === "up" ? "arrow-up" : "arrow-down"} size={12} /> : null}
          <span className="sr-only">{words[dir]} </span>
          {dir === "same" ? words.same : amount}
        </span>
        {periodLabel != null ? <span className="nf-kpi__period">{periodLabel}</span> : null}
      </p>
    );
  }
  const body = (
    <>
      <p className="nf-kpi__head">
        {icon ? <UiIcon name={icon} size={16} className="nf-kpi__glyph" /> : null}
        <span className="nf-section-label nf-kpi__label">{label}</span>
        {href ? (
          <span className="nf-kpi__door" aria-hidden="true">
            <UiIcon name="chevron-right" size={16} />
          </span>
        ) : null}
      </p>
      <p className="nf-kpi__figure">
        <CountUp value={value} tag={tag} eager />
        {unit != null ? <span className="nf-kpi__unit">{unit}</span> : null}
      </p>
      {delta ?? (sub != null ? <p className="nf-kpi__sub">{sub}</p> : null)}
    </>
  );
  const cls = ["nf-kpi", href ? "nf-kpi--door" : "", className ?? ""].filter(Boolean).join(" ");
  return href ? (
    <Link href={href} className={cls} aria-label={linkLabel}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
