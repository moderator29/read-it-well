import { CountUp } from "@/components/motion/CountUp";
import { Amount } from "@/components/ui/Amount";
import type { Locale } from "@vallo/i18n/core";

/**
 * THE FIGURE HERO FOR THE AREA, ON THE STAYS AND RESTAURANTS SHELVES
 * (Session 3, W2; north star 10 B: "figure hero for the area").
 *
 * What it would say: how many stays (or tables) are listed in the reader's
 * area, and the lowest nightly rate among them. Both are aggregates over the
 * catalogue scoped to a place, which is a read with a privacy and sample floor
 * that Session 2 owns (cross-session contract: "3 owns the chart system and
 * the components, 2 owns the aggregation queries"). It does not exist yet, so
 * the pages pass `null` and nothing is drawn: the greeting leads, which is the
 * generic surface rendered honestly. Request W2-R3 in Session 3's response
 * carries the exact shape below.
 *
 * Built now, against that shape, so the day the read lands it is one line in
 * each page and not a design task. The count counts up once (motion 4); the
 * rate is a stated price and is printed still, because a "from" figure that
 * spins reads like a deal and it is not one.
 */
export type AreaShelfSummary = {
  /** The place the reader set, as the selector names it. */
  placeLabel: string;
  /** Live listings of this kind in that place. Never an estimate. */
  count: number;
  /** The lowest stated nightly rate among them, in kobo, or null when none states one. */
  fromMinor: number | null;
  currency: string;
};

export function AreaFigure({
  summary,
  locale,
  tag,
  copy,
}: {
  summary: AreaShelfSummary;
  locale: Locale;
  /** BCP 47 tag for the digits (`intlTag` from `@vallo/i18n`). */
  tag: string;
  copy: { caption: string; unitOne: string; unitMany: string; from: string };
}) {
  if (summary.count <= 0) return null;
  return (
    <div className="nf-home-figure" data-testid="area-figure">
      <p className="nf-home-figure__caption">{copy.caption.replace("{place}", summary.placeLabel)}</p>
      <p className="nf-home-figure__line">
        <span className="nf-home-figure__value nf-numeric">
          <CountUp value={summary.count} tag={tag} eager />
        </span>
        <span className="nf-home-figure__unit">{summary.count === 1 ? copy.unitOne : copy.unitMany}</span>
      </p>
      {summary.fromMinor !== null && summary.fromMinor > 0 ? (
        <p className="nf-home-figure__unit">
          {copy.from}{" "}
          <Amount minorUnits={summary.fromMinor} locale={locale} currency={summary.currency} glance className="nf-numeric font-semibold text-[var(--nf-content-primary)]" />
        </p>
      ) : null}
    </div>
  );
}
