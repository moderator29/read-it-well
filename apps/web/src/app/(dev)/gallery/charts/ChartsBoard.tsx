"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { axisTicks, type VizPoint } from "@/components/ui/charts/chart-rules";
import { ChartTable, type ChartRow } from "@/components/ui/charts/ChartTable";
import { CompareBars, type CompareRow } from "@/components/ui/charts/CompareBars";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import { TrendLine } from "@/components/ui/charts/TrendLine";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * THE CHART SYSTEM (B-26; rules at the top of `chart-rules.ts`, which is the
 * single definition point and the thing to read first).
 *
 * THE DATA IS SHAPE, NOT DATA. Every series here is a short run of unitless
 * test values with slot names for periods ("Period one"), so the board can show
 * how a chart DRAWS (a hatched slot, a zero, a tiny real value, a broken line,
 * a comparison) without any figure that could be mistaken for something that
 * happened. No unit, no currency, no real period. The primitives draw only what
 * they are handed and a caller with no source passes nulls or draws no chart.
 *
 * The three states of a period are the thing to look for: `null` is a hatched
 * slot the full height of the plot (nothing on record), `0` is no bar with the
 * baseline showing (a measured zero), and anything above zero is a bar no
 * shorter than 2px. They are three different facts.
 */

const NUMBER_WORDS = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen"];

function series(values: readonly (number | null)[]): VizPoint[] {
  return values.map((value, i) => ({
    key: `p${i + 1}`,
    tick: `P${i + 1}`,
    label: `Period ${NUMBER_WORDS[i] ?? i + 1}`,
    value,
    display: value === null ? undefined : String(value),
  }));
}

function ticksFor(values: readonly (number | null)[]) {
  return axisTicks(Math.max(0, ...values.map((v) => v ?? 0)), String);
}

const BARS_A = [3, 5, 2, 7, 4, 6];
const BARS_B = [6, 2, 5, 3, 7, 1];
/* One tiny real value (1 against a scale of 40) and a measured zero. */
const BARS_STATES = [4, null, 0, 6, null, 1];
const BARS_EMPTY = [null, null, null, null, null, null];
const LINE_A = [2, 3, 3, 5, 4, 6, 7, 6, 8, 7, 9, 8, 10, 11];
const LINE_B = [9, 8, 8, 6, 7, 5, 4, 5, 3, 4, 2, 3, 2, 1];
const LINE_PREVIOUS = [1, 2, 2, 3, 3, 4, 5, 4, 6, 5, 6, 7, 7, 8];
const LINE_GAP = [2, 3, 3, null, null, 6, 7, 6, 8, 7, 9, 8, 10, 11];

const TABLE_HEADS = { periodHead: "Period", valueHead: "Value" } as const;

function Card({ children }: { children: ReactNode }) {
  return <Panel variant="card">{children}</Panel>;
}

function PeriodBarsMorph() {
  const [which, setWhich] = useState<"a" | "b">("a");
  const values = which === "a" ? BARS_A : BARS_B;
  return (
    <Specimen label="PeriodBars, series change morphs the bars (380ms)">
      <div className="nf-sg-row">
        <Button variant="glass" size="sm" onClick={() => setWhich((w) => (w === "a" ? "b" : "a"))}>
          Change the series
        </Button>
      </div>
      <Card>
        <PeriodBars
          points={series(values)}
          yTicks={ticksFor(BARS_A.concat(BARS_B))}
          label="Test series, unitless"
          summary="A test series with six periods."
          {...TABLE_HEADS}
        />
      </Card>
    </Specimen>
  );
}

function TrendMorph() {
  const [which, setWhich] = useState<"a" | "b">("a");
  const values = which === "a" ? LINE_A : LINE_B;
  return (
    <Specimen label="TrendLine, series change interpolates every point (380ms)">
      <div className="nf-sg-row">
        <Button variant="glass" size="sm" onClick={() => setWhich((w) => (w === "a" ? "b" : "a"))}>
          Change the series
        </Button>
      </div>
      <Card>
        <TrendLine
          points={series(values)}
          yTicks={ticksFor(LINE_A.concat(LINE_B))}
          label="Test series, unitless"
          summary="A test series with fourteen periods."
          {...TABLE_HEADS}
        />
      </Card>
    </Specimen>
  );
}

const COMPARE_ROWS: readonly CompareRow[] = [
  { key: "r1", label: "Measure one", current: 8, currentDisplay: "8", previous: 5, previousDisplay: "5" },
  { key: "r2", label: "Measure two", current: 3, currentDisplay: "3", previous: 6, previousDisplay: "6" },
  { key: "r3", label: "Measure three (previous has no record)", current: 4, currentDisplay: "4", previous: null, previousDisplay: "No record" },
];

const TABLE_ROWS: readonly ChartRow[] = series(BARS_STATES).map((p, i) => ({
  key: p.key,
  label: p.label,
  display: p.display ?? null,
  compare: BARS_A[i] === undefined ? null : String(BARS_A[i]),
}));

export function ChartsBoard() {
  return (
    <SystemFrame
      slug="charts"
      title="Charts"
      lede="The question picks the chart: amount per period is bars, movement over days is a line, this against last is a comparison, and one number is a Figure. One hue, never colour alone, and a table twin always. The values are unitless test shapes, not data."
    >
      <Section title="PeriodBars" note="Bars grow from the baseline over 620ms, 30ms apart. The peak is labelled at rest; under the pointer the others recede. Tab to the plot, then Left and Right.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <PeriodBarsMorph />
          <Specimen label="Hatched nulls, a measured zero and a tiny real value">
            <Card>
              <PeriodBars
                points={series(BARS_STATES)}
                yTicks={ticksFor(BARS_STATES.concat([40]))}
                label="Test series with three kinds of period"
                summary="Nothing on record, a measured zero and a small real value."
                nullLabel="No record"
                emphasis="last"
                {...TABLE_HEADS}
              />
            </Card>
          </Specimen>
          <Specimen label="Every period hatched: the frame stays and says why">
            <Card>
              <PeriodBars
                points={series(BARS_EMPTY)}
                yTicks={ticksFor([5])}
                label="Test series with nothing on record"
                nullLabel="No record"
                empty={<span>The empty sentence, in the words of the caller.</span>}
                {...TABLE_HEADS}
              />
            </Card>
          </Specimen>
        </div>
      </Section>

      <Section title="TrendLine" note="The first draw unrolls left to right over 620ms. A null is a gap: the line breaks and the period is hatched, never bridged. The second series is grey, dashed, with a hollow end marker, and a legend always names both.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <TrendMorph />
          <Specimen label="With a comparison series (the same measure, the previous period)">
            <Card>
              <TrendLine
                points={series(LINE_A)}
                yTicks={ticksFor(LINE_A)}
                label="Test series against its previous period"
                seriesLabel="This period"
                compare={{
                  label: "Previous period",
                  values: LINE_PREVIOUS,
                  displays: LINE_PREVIOUS.map(String),
                }}
                {...TABLE_HEADS}
              />
            </Card>
          </Specimen>
          <Specimen label="With a gap">
            <Card>
              <TrendLine
                points={series(LINE_GAP)}
                yTicks={ticksFor(LINE_GAP)}
                label="Test series with a gap"
                nullLabel="No record"
                {...TABLE_HEADS}
              />
            </Card>
          </Specimen>
        </div>
      </Section>

      <Section title="CompareBars" note="Two periods of the same measure on one shared scale per row, each figure printed beside its bar, so the rows are the table. Never against another member and never ranked.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <Specimen label="Current against previous, with a missing previous">
            <Card>
              <CompareBars rows={COMPARE_ROWS} currentLabel="This period" previousLabel="Previous period" label="Test comparison" />
            </Card>
          </Specimen>
        </div>
      </Section>

      <Section title="ChartTable" note="Every chart carries its data as a real table, hidden from sight by default so no value is ever reachable only by hover. Shown here, with a comparison column. A null prints as the caller's word, never as zero.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <Specimen label="ChartTable, visible">
            <Card>
              <ChartTable
                caption="Test series as a table"
                periodHead="Period"
                valueHead="Value"
                compareHead="Comparison"
                rows={TABLE_ROWS}
                nullLabel="No record"
                visible
              />
            </Card>
          </Specimen>
        </div>
      </Section>
    </SystemFrame>
  );
}
