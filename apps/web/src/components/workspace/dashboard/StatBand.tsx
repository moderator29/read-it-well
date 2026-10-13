import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { CountUp } from "@/components/motion/CountUp";
import "./dashboard.css";

/**
 * The band of four tiles at the head of each dashboard. On a phone it is the
 * one thing that scrolls sideways; from 768px it is four columns.
 */
export function StatBand({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wsd-band" role="group" aria-label={label} data-testid="wsd-band">
      {children}
    </div>
  );
}

/**
 * One tile: a label, a figure and a quiet line under it. The figure is a
 * count (it counts up once) or already-formatted text such as money. A tile
 * whose read failed is not drawn by the caller, so no tile ever shows an
 * unread number as zero. With `href` the whole tile is a door.
 */
export function StatTile({
  label,
  icon,
  count,
  text,
  sub,
  href,
  attention = false,
  tag,
}: {
  label: string;
  icon: UiIconName;
  count?: number;
  text?: ReactNode;
  sub?: string;
  href?: string;
  /** Something waits on the reader: the tile's edge says so. */
  attention?: boolean;
  tag: string;
}) {
  const body = (
    <>
      <p className="wsd-tile__head">
        <UiIcon name={icon} size={16} />
        <span className="wsd-tile__label">{label}</span>
        {href ? (
          <span className="wsd-tile__door" aria-hidden="true">
            <UiIcon name="chevron-right" size={16} />
          </span>
        ) : null}
      </p>
      <p className={["wsd-tile__figure", typeof count === "number" ? "" : "wsd-tile__figure--text"].filter(Boolean).join(" ")}>
        {typeof count === "number" ? <CountUp value={count} tag={tag} eager /> : text}
      </p>
      {sub ? <p className="wsd-tile__sub">{sub}</p> : null}
    </>
  );
  const cls = ["wsd-tile", attention ? "wsd-tile--attention" : ""].filter(Boolean).join(" ");
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
