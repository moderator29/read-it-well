"use client";

import { useState } from "react";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import type { AxisTick, VizPoint } from "@/components/ui/charts/chart-rules";
import { Segmented } from "@/components/ui/Segmented";

export type MonthSeries = {
  key: string;
  label: string;
  /** The bars. A series with nothing in the window arrives with every value null, which draws the hatched frame and says why. */
  points: VizPoint[];
  yTicks: AxisTick[];
};

/**
 * Enquiries and visits by month, one series at a time (the chart law allows
 * one ink), switched by a segmented control. The series are counted on the
 * server from real rows; this only chooses which to draw. A series with no
 * rows in the window shows the frame hatched and says so in words.
 */
export function MonthSeriesChart({
  title,
  periodHead,
  empty,
  series,
}: {
  title: string;
  periodHead: string;
  empty: string;
  series: readonly MonthSeries[];
}) {
  const [active, setActive] = useState(series[0]?.key ?? "");
  const current = series.find((s) => s.key === active) ?? series[0];
  if (!current) return null;
  return (
    <div className="grid gap-sm" data-testid="wsd-month-chart">
      {series.length > 1 ? (
        <Segmented
          options={series.map((s) => ({ value: s.key, label: s.label }))}
          value={current.key}
          onChange={setActive}
          variant="solid"
          size="sm"
          label={title}
        />
      ) : null}
      <PeriodBars
        key={current.key}
        points={current.points}
        yTicks={current.yTicks}
        label={`${title}: ${current.label}`}
        periodHead={periodHead}
        valueHead={current.label}
        emphasis="last"
        empty={empty}
        height={152}
      />
    </div>
  );
}
