"use client";

import { useMemo, useState } from "react";
import { formatMoney, formatMoneyGlance, formatNumber, type Locale } from "@vallo/i18n/core";
import { Segmented, SegmentedPanel } from "@/components/ui/Segmented";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import { axisTicks, type VizPoint } from "@/components/ui/charts/chart-rules";
import { Amount } from "@/components/ui/Amount";
import { CountUpMoney } from "@/components/motion/CountUp";
import type { AreaAskingRow } from "@/lib/price-check/types";
import "./area-chart.css";

/**
 * WHAT AN AREA IS ASKING, AS A FIGURE AND A CHART (Session 3, W2; north star
 * 10 B "odometer figures, period segments, the chart system, hatched where
 * thin"; references 7065, 7066 and 7083; `dataviz` loaded first).
 *
 * THE QUESTION PICKS THE FORM (chart-rules.ts rule 1). The read
 * (`area_asking_summary`, Session 2's) answers "what is the middle asking
 * price for each size of home here", one row per type and bedroom count, each
 * with its own count. So:
 *
 *   THE SEGMENTS choose the property type (Flat, House, Shop, Office), the
 *     one dimension the read is cut by that a person switches between. They
 *     are only the types the read actually returned: a segment that opened on
 *     nothing would be a control advertising an absence. The read carries no
 *     history, so there is no Day / Week / Month here to switch; a trend over
 *     time is request W2-R5 and is not drawn from nothing.
 *   THE FIGURE leads: the middle asking price of the size that has the most
 *     listings for that type, with its size and count beneath. It counts up
 *     once on arrival (motion 4) and, when the segment changes, its changed
 *     digits roll (motion 5, `CountUpMoney` handing over to the odometer):
 *     the figure changed because the reader asked a different question, never
 *     because money moved.
 *   THE BARS are bedroom counts, studio to five or the largest held, the
 *     discrete ordered buckets PeriodBars is for. A size with no published
 *     range is a HATCHED SLOT (rule 4, reference 7083): the frame says the
 *     size exists and that we hold too little to say anything, which is the
 *     honest shape of a young catalogue. Switching type MORPHS the bars (380ms
 *     `glide`, the same keys), rather than redrawing them.
 *   THE SENTENCE under them, the quartiles and the basis, crossfades with the
 *     segment (`SegmentedPanel`, 160ms).
 *
 * Every figure here is the read's own (median and quartiles in kobo from the
 * RPC). Nothing is divided, summed or estimated on this screen.
 */
const TYPE_ORDER = ["apartment", "home", "shop", "office"] as const;

export type AreaChartCopy = {
  segmentsLabel: string;
  middleCaption: string;
  middleWhat: string;
  studioWhat: string;
  range: string;
  basis: string;
  /** The basis line for exactly one listing ("From 1 listing."). */
  basisOne?: string;
  chartLabel: string;
  chartSummary: string;
  periodHead: string;
  valueHead: string;
  /** The table's word for a size with no published range. */
  thinCell: string;
  /** The sentence that explains the hatched slots. */
  thinNote: string;
  studioTick: string;
  bedTick: string;
};

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

export function AreaAskingChart({
  rows,
  locale,
  typeNames,
  copy,
}: {
  rows: readonly AreaAskingRow[];
  locale: Locale;
  typeNames: Record<string, string>;
  copy: AreaChartCopy;
}) {
  const types = useMemo(
    () => TYPE_ORDER.filter((type) => rows.some((row) => row.propertyType === type)),
    [rows],
  );
  const [type, setType] = useState<string>(types[0] ?? "apartment");

  /* The area can change under a chosen type (the read for a new area may not
     hold that type). The segments only ever offer `types`, so a stale choice
     falls back to the first type held rather than leaving a chart that
     returns nothing and no segment to click back with. */
  const current = types.includes(type as (typeof TYPE_ORDER)[number]) ? type : types[0];
  if (current === undefined) return null;
  const forType = rows.filter((row) => row.propertyType === current);
  if (forType.length === 0) return null;

  /* The lead: the size with the most listings behind it, the firmest claim. */
  const lead = [...forType].sort((a, b) => b.listingCount - a.listingCount || a.bedrooms - b.bedrooms)[0]!;
  /* Sentence case: the type names are capitalised for the segments, but
     inside a sentence they are common nouns ("3 bedroom flat"). */
  const typeName = (typeNames[current] ?? current).toLocaleLowerCase(locale);
  const what = (bedrooms: number) =>
    bedrooms > 0 ? fill(copy.middleWhat, { bedrooms, type: typeName }) : fill(copy.studioWhat, { type: typeName });

  /* Studio to five bedrooms, or to the largest the read holds. */
  const top = Math.max(5, ...rows.map((row) => row.bedrooms));
  const points: VizPoint[] = Array.from({ length: top + 1 }, (_, bedrooms) => {
    const row = forType.find((r) => r.bedrooms === bedrooms);
    return {
      key: `b${bedrooms}`,
      tick: bedrooms === 0 ? copy.studioTick : fill(copy.bedTick, { bedrooms }),
      label: what(bedrooms),
      value: row ? row.medianMinor : null,
      ...(row ? { display: formatMoney(row.medianMinor, locale) } : {}),
    };
  });
  const max = Math.max(0, ...forType.map((row) => row.medianMinor));
  const yTicks = axisTicks(max, (value) => formatMoneyGlance(value, locale), 3, true);

  return (
    <section className="nf-area-chart" data-testid="nf-pc-area-chart">
      {types.length > 1 ? (
        <Segmented
          label={copy.segmentsLabel}
          value={current}
          onChange={setType}
          options={types.map((value) => ({ value, label: typeNames[value] ?? value }))}
          itemIdPrefix="nf-area-type"
          panelIdPrefix="nf-area-panel"
          size="sm"
        />
      ) : null}

      <div className="nf-area-chart__figure">
        <p className="nf-area-chart__caption">{fill(copy.middleCaption, { what: what(lead.bedrooms) })}</p>
        <p className="nf-area-chart__value nf-numeric">
          <CountUpMoney minorUnits={lead.medianMinor} locale={locale} glance eager frameClassName="nf-area-chart__value">
            <Amount minorUnits={lead.medianMinor} locale={locale} glance />
          </CountUpMoney>
        </p>
      </div>

      <PeriodBars
        points={points}
        yTicks={yTicks}
        label={fill(copy.chartLabel, { type: typeName })}
        summary={copy.chartSummary}
        periodHead={copy.periodHead}
        valueHead={copy.valueHead}
        nullLabel={copy.thinCell}
        emphasis={lead.bedrooms}
        height={160}
      />

      <SegmentedPanel value={current} panelIdPrefix="nf-area-panel" itemIdPrefix="nf-area-type">
        <p className="nf-area-chart__range nf-body-sm">
          {fill(copy.range, {
            low: formatMoneyGlance(lead.p25Minor, locale),
            high: formatMoneyGlance(lead.p75Minor, locale),
          })}{" "}
          <span className="text-[var(--nf-content-muted)]">
            {fill(lead.listingCount === 1 && copy.basisOne ? copy.basisOne : copy.basis, {
              count: formatNumber(lead.listingCount, locale),
            })}
          </span>
        </p>
        {/* Explains the hatching, so it is said only when a slot is hatched. */}
        {points.some((point) => point.value === null) ? (
          <p className="nf-caption mt-inline-tight text-[var(--nf-content-muted)]">{copy.thinNote}</p>
        ) : null}
      </SegmentedPanel>
    </section>
  );
}
