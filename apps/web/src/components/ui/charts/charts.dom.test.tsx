/**
 * THE CHART SYSTEM'S PRIMITIVES (B-26), rendered for real.
 *
 * Each rule in `chart-rules.ts` that a renderer can break has a check here:
 * a null is a hatched slot and never a bar, a zero is no bar, a tiny real
 * value is still drawn, every value reaches the table twin, the empty frame
 * says why in words and offers no tab stop, a line breaks at a gap rather than
 * bridging it, a second series always arrives with a legend, and the whole
 * set passes axe in Chromium where one is installed.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import {
  allAbsent,
  axisTicks,
  glide,
  niceStep,
  peakIndex,
  resample,
  showEvery,
  stepIndex,
  tickEveryFor,
  type VizPoint,
} from "./chart-rules";
import { ORDINAL_ALPHA, ordinalAlpha } from "./palette";
import { PeriodBars } from "./PeriodBars";
import { TrendLine, runs } from "./TrendLine";
import { CompareBars } from "./CompareBars";
import { ChartTable } from "./ChartTable";

afterAll(closeAxe);

const fmt = (n: number) => `N${n}`;
const month = (key: string, value: number | null): VizPoint => ({
  key,
  tick: key.slice(5),
  label: `Month ${key}`,
  value,
  display: value === null ? undefined : fmt(value),
});

describe("the chart rules' arithmetic", () => {
  it("steps the axis in clean numbers", () => {
    expect(niceStep(3)).toBe(5);
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(1800)).toBe(2000);
    expect(niceStep(240)).toBe(250);
    expect(niceStep(0)).toBe(1);
  });

  it("puts zero first, covers the maximum, and never prints half a count", () => {
    const ticks = axisTicks(7, String);
    expect(ticks[0]).toEqual({ value: 0, label: "0" });
    expect(ticks[ticks.length - 1]!.value).toBeGreaterThanOrEqual(7);
    expect(ticks.every((t) => Number.isInteger(t.value))).toBe(true);
    expect(axisTicks(3, String).map((t) => t.value)).toEqual([0, 1, 2, 3]);
    expect(axisTicks(61000, String).map((t) => t.value)).toEqual([0, 25000, 50000, 75000]);
    expect(axisTicks(0, String)).toEqual([{ value: 0, label: "0" }]);
  });

  it("labels the first, the last and an even spread, never crowding the last", () => {
    const shown = Array.from({ length: 12 }, (_, i) => showEvery(i, 12, 2));
    expect(shown[0]).toBe(true);
    expect(shown[11]).toBe(true);
    expect(shown[10]).toBe(false);
    expect(tickEveryFor(6)).toBe(1);
    expect(tickEveryFor(30)).toBe(5);
  });

  it("walks the periods from the keyboard and clamps at the ends", () => {
    expect(stepIndex(null, "ArrowLeft", 5)).toBe(3);
    expect(stepIndex(0, "ArrowLeft", 5)).toBe(0);
    expect(stepIndex(4, "ArrowRight", 5)).toBe(4);
    expect(stepIndex(2, "Home", 5)).toBe(0);
    expect(stepIndex(2, "End", 5)).toBe(4);
    expect(stepIndex(2, "a", 5)).toBe(2);
    expect(stepIndex(null, "End", 0)).toBeNull();
  });

  it("resamples a line onto a new length so a period morph never invents a jump", () => {
    expect(resample([0, 10], 3)).toEqual([0, 5, 10]);
    expect(resample([4], 3)).toEqual([4, 4, 4]);
    expect(resample([], 2)).toEqual([0, 0]);
  });

  it("eases from 0 to 1 on the glide curve", () => {
    expect(glide(0)).toBeCloseTo(0, 5);
    expect(glide(1)).toBeCloseTo(1, 5);
    expect(glide(0.5)).toBeGreaterThan(0.5);
  });

  it("tells absence from zero and finds the peak among recorded values", () => {
    expect(allAbsent([{ value: null }, { value: null }])).toBe(true);
    expect(allAbsent([{ value: null }, { value: 0 }])).toBe(false);
    expect(peakIndex([{ value: null }, { value: 3 }, { value: 9 }, { value: 0 }])).toBe(2);
    expect(peakIndex([{ value: null }])).toBe(-1);
  });

  it("keeps the ordinal ramp to the three validated stops", () => {
    expect(ORDINAL_ALPHA).toEqual([1, 0.78, 0.6]);
    expect(ordinalAlpha(9)).toBe(0.6);
    expect(ordinalAlpha(-1)).toBe(1);
  });

  it("breaks a line into runs at every gap", () => {
    expect(runs([1, 2, null, 3, null, null, 4])).toEqual([[0, 1], [3], [6]]);
  });
});

describe("PeriodBars", () => {
  const points = [
    month("2026-04", null),
    month("2026-05", 0),
    month("2026-06", 1),
    month("2026-07", 5000),
  ];
  const html = renderToStaticMarkup(
    <PeriodBars
      points={points}
      yTicks={axisTicks(5000, fmt)}
      label="Settled by month"
      summary="Best month July."
      periodHead="Month"
      valueHead="Your share"
      nullLabel="No record"
    />,
  );

  it("draws a bar only for a value above zero, and a hatched slot for a null", () => {
    expect(html.match(/class="nf-viz-bar"/g)).toHaveLength(2);
    expect(html.match(/nf-viz-col is-empty/g)).toHaveLength(1);
  });

  it("keeps a tiny real value visible rather than drawing it as nothing", () => {
    /* 1 against 5000 is 0.0002 of the plot; the bar still renders and the
       stylesheet floors it at 2px. */
    expect(html).toContain("--nf-viz-v:0.0002");
  });

  it("grows from the baseline in order, 30ms apart", () => {
    expect(html).toContain("--nf-viz-i:2");
    expect(html).toContain("--nf-viz-i:3");
  });

  it("labels only the peak at rest", () => {
    expect(html.match(/nf-viz-tip/g)).toHaveLength(1);
    expect(html).toMatch(/nf-viz-tip[^>]*>N5000</);
  });

  it("carries every period to the table, a null in words and a zero as zero", () => {
    expect(html).toContain("<caption>Settled by month</caption>");
    expect(html).toMatch(/Month 2026-04<\/th><td[^>]*>No record</);
    expect(html).toMatch(/Month 2026-05<\/th><td[^>]*>N0</);
  });

  it("is one tab stop named by its label and summary", () => {
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Settled by month. Best month July."');
  });

  it("keeps the frame and says why when nothing is on record", () => {
    const empty = renderToStaticMarkup(
      <PeriodBars
        points={[month("2026-05", null), month("2026-06", null), month("2026-07", null)]}
        yTicks={axisTicks(0, fmt)}
        label="Settled by month"
        periodHead="Month"
        valueHead="Your share"
        empty="Nothing has settled yet."
      />,
    );
    expect(empty.match(/nf-viz-col is-empty/g)).toHaveLength(3);
    expect(empty).toContain("Nothing has settled yet.");
    expect(empty).not.toContain("tabindex");
    expect(empty).not.toContain("<table");
    expect(empty).not.toContain('class="nf-viz-bar"');
  });

  it("draws nothing at all for no periods", () => {
    expect(
      renderToStaticMarkup(<PeriodBars points={[]} yTicks={[]} label="x" periodHead="a" valueHead="b" />),
    ).toBe("");
  });
});

describe("TrendLine", () => {
  const points = [month("d1", 2), month("d2", 4), month("d3", null), month("d4", 3)];
  it("draws the line, breaks it at a gap and hatches the gap", () => {
    const html = renderToStaticMarkup(
      <TrendLine points={points} yTicks={axisTicks(4, fmt)} label="Requests" periodHead="Day" valueHead="Requests" />,
    );
    expect(html).toContain("nf-viz-draw");
    expect(html.match(/nf-viz-gap/g)).toHaveLength(1);
    /* Two runs, two moves: the line is never bridged across the null. */
    const line = html.match(/<path d="(M[^"]*)" fill="none"/);
    expect(line?.[1]?.match(/M/g)).toHaveLength(2);
    expect(html).toContain("nf-viz-dot--end");
    expect(html).not.toContain("nf-viz__legend");
  });

  it("brings a legend and a table column with a comparison series", () => {
    const html = renderToStaticMarkup(
      <TrendLine
        points={points}
        yTicks={axisTicks(4, fmt)}
        label="Requests"
        periodHead="Day"
        valueHead="Requests"
        seriesLabel="This week"
        compare={{ label: "Last week", values: [1, 1, 2, 2], displays: ["N1", "N1", "N2", "N2"] }}
      />,
    );
    expect(html).toContain("nf-viz__legend");
    expect(html).toContain("This week");
    expect(html).toContain('<th scope="col">Last week</th>');
    expect(html).toContain('stroke-dasharray="6 5"');
  });

  it("draws nothing when nothing is on record", () => {
    expect(
      renderToStaticMarkup(
        <TrendLine points={[month("a", null)]} yTicks={[]} label="x" periodHead="a" valueHead="b" />,
      ),
    ).toBe("");
  });
});

describe("CompareBars", () => {
  const html = renderToStaticMarkup(
    <CompareBars
      label="This month against last month"
      currentLabel="This month"
      previousLabel="Last month"
      rows={[
        { key: "share", label: "Your share", current: 300, currentDisplay: "N300", previous: 150, previousDisplay: "N150" },
        { key: "stays", label: "Stays", current: 2, currentDisplay: "2", previous: null, previousDisplay: "No record" },
      ]}
    />,
  );

  it("prints every figure and names both periods", () => {
    for (const text of ["N300", "N150", "No record", "This month", "Last month"]) expect(html).toContain(text);
  });

  it("scales each row against itself and hatches the previous period", () => {
    expect(html).toContain("--nf-viz-v:1.0000");
    expect(html).toContain("--nf-viz-v:0.5000");
    expect(html.match(/nf-viz-hbar--context/g)).toHaveLength(1);
  });
});

describe("ChartTable", () => {
  it("is hidden by default and visible on request", () => {
    const rows = [{ key: "a", label: "A", display: null }];
    expect(renderToStaticMarkup(<ChartTable caption="c" periodHead="p" valueHead="v" rows={rows} />)).toContain(
      'class="sr-only"',
    );
    expect(
      renderToStaticMarkup(<ChartTable caption="c" periodHead="p" valueHead="v" rows={rows} visible />),
    ).toContain('class="nf-viz-table"');
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the chart primitives (axe)", () => {
  it("pass axe as rendered", async () => {
    const html = renderToStaticMarkup(
      <div>
        <h1>Charts</h1>
        <PeriodBars
          points={[month("2026-06", 10), month("2026-07", null), month("2026-08", 4)]}
          yTicks={axisTicks(10, fmt)}
          label="Settled by month"
          periodHead="Month"
          valueHead="Your share"
        />
        <PeriodBars
          points={[month("2026-06", null)]}
          yTicks={axisTicks(0, fmt)}
          label="Empty"
          periodHead="Month"
          valueHead="Your share"
          empty="Nothing yet."
        />
        <TrendLine
          points={[month("d1", 1), month("d2", 3)]}
          yTicks={axisTicks(3, fmt)}
          label="Requests"
          periodHead="Day"
          valueHead="Requests"
          compare={{ label: "Before", values: [2, 2], displays: ["2", "2"] }}
        />
        <CompareBars
          label="Compare"
          currentLabel="Now"
          previousLabel="Before"
          rows={[{ key: "a", label: "A", current: 1, currentDisplay: "1", previous: 2, previousDisplay: "2" }]}
        />
      </div>,
    );
    expect(await axe(html)).toEqual([]);
  });
});
