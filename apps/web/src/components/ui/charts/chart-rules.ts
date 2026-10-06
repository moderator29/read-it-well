/**
 * ===========================================================================
 * THE VALLO CHART SYSTEM (B-26, Session 3, 6 October 2026)
 * ===========================================================================
 *
 * Every chart on the platform follows the rules below. They were written
 * after loading the `dataviz` skill (directives D10 and D27) and mapping its
 * method onto Vallo's single blue hue; the palette numbers were computed with
 * that skill's validator rather than judged by eye. Later sessions apply
 * these rules; a chart that needs to break one is the wrong chart.
 *
 * ---------------------------------------------------------------------------
 * 1. THE QUESTION PICKS THE FORM. COLOUR COMES LAST.
 *
 *   "How much this period, and how did it go?"  PeriodBars. Discrete buckets
 *       (a month, a week). Bars claim only what happened in each bucket; a
 *       line would draw values between months that were never true.
 *   "Which way is it moving?"                   TrendLine. Continuous counts
 *       over days, where the shape between points is the point.
 *   "This period against the last one."          CompareBars. Two periods of
 *       the SAME measure, side by side, each labelled with its figure. Never
 *       against another member (north star 15.3), never a leaderboard.
 *   "What share of the whole?"                   StatusBar (one line of
 *       lengths). Only when the parts genuinely add up to a whole that means
 *       something, and never a donut: angles are read worse than lengths and
 *       reference 7084's four-hue donut is refused by name.
 *   "One number."                                 Not a chart. A Figure, a
 *       HeroFigure or a KpiTile. A one-bar chart is a stat tile drawn badly.
 *
 * ONE Y AXIS, EVER. Two measures of different scale are two charts.
 *
 * ---------------------------------------------------------------------------
 * 2. THE PALETTE IS ONE HUE, AND THAT IS A RULE, NOT A LIMITATION.
 *
 * North star section 3: the palette is one blue, so colour alone may never be
 * the only signal; section 9 refuses four-hue charts and allows "brand plus
 * neutral plus one semantic". The dataviz method maps onto that as follows,
 * every slot a role token (never a ramp rung, see `palette.ts`):
 *
 *   series    --nf-chart-series (the brand primary). The measured quantity. Slot 1, always.
 *   context   --nf-chart-context (the muted ink). The comparison or de-emphasised series
 *             (the previous period, "everything else"). The dataviz
 *             "emphasis" form: one hue plus grey.
 *   ordinal   the brand at alpha 1, 0.78, 0.60 over the chart surface, for
 *             ordered steps (rank, stage) only. Never for nominal categories.
 *   semantic  ONE state token where the colour MEANS something (a promise
 *             line, an overdue count), always with a word beside it.
 *   absence   the hatch: a 135 degree hairline pattern in --nf-chart-hatch
 *             on a transparent ground. Not a colour at all. See rule 4.
 *
 * VALIDATED (dataviz `validate_palette.js`, OKLab delta E x100, Machado 2009):
 *   ordinal light, #005FE8 at 1 / 0.78 / 0.60 on #FFFFFF
 *     PASS monotone, PASS step gaps >= 0.06, PASS light end 2.69:1
 *   ordinal dark, #0069FE at 1 / 0.78 / 0.60 on #0A1231
 *     PASS monotone, PASS step gaps >= 0.06, PASS light end 2.17:1
 *     (the old five-stop ramp down to 0.42 FAILED here at 1.88:1, which is
 *     why the new primitives use three stops; `rampAlpha` keeps its five for
 *     the console's ranked lists, which carry a figure on every row)
 *   series plus context, light #005FE8 + #646A74 on #FFFFFF
 *     PASS CVD 19.3, PASS normal vision 20.4, PASS contrast both >= 3:1
 *   series plus context, dark #0069FE + #8E9CC4 on #040A1F
 *     PASS CVD 18.1, PASS normal vision 21.8, PASS contrast both >= 3:1
 *     The chroma-floor "fail" on the context ink is the design: it is grey
 *     on purpose, and identity is carried by pattern and label as well.
 *   A second BLUE as a categorical slot was tested and refused: the best
 *   pair (#005FE8 / #478CEE) fails the normal-vision floor at 12.7. Inside
 *   one hue, two series are told apart by brand-versus-grey plus a pattern,
 *   never by two blues. A third series is a second chart.
 *
 * TEXT NEVER WEARS THE DATA COLOUR. Labels, values, axes and legends are in
 * --nf-content-primary / secondary / muted. Identity comes from the mark
 * beside the word.
 *
 * ---------------------------------------------------------------------------
 * 3. NON-COLOUR ENCODING, ON EVERY CHART.
 *
 *   pattern  the context series is hatched (bars) or dashed (lines); the
 *            series is solid. Survives greyscale print and forced colours.
 *   marker   the line's last point carries an 8px dot with a 2px surface
 *            ring; the context line's is hollow.
 *   label    a legend whenever two series share a plot, and a direct label
 *            on the one figure the story is about (the end of a line, the
 *            tip of the emphasised bar). Never a number on every point.
 *   table    every chart carries its data as a table (visually hidden by
 *            default, `ChartTable`), so a tooltip never gates a value.
 *
 * ---------------------------------------------------------------------------
 * 4. SPARSE AND EMPTY: THE HATCHED SLOT (reference 7083).
 *
 * The most useful pattern for a platform this young. A period that exists on
 * the axis but has nothing on record is drawn as a hatched slot the full
 * height of the plot: a uniform outline that says "this period is here and
 * there is nothing in it", never a bar of nominal height that could be read
 * as a quantity. A chart whose every slot is hatched keeps its frame and its
 * real period labels, and says in words why it is empty and what fills it.
 *
 *   value === null  no record: hatched slot, "-" in the table (or the
 *                   caller's word for it). Distinct from zero.
 *   value === 0     a measured zero: no bar, the baseline shows, "0" in the
 *                   table. The ledger is complete, so zero is a fact.
 *   value > 0       a bar, never shorter than 2px so a tiny real figure is
 *                   never drawn as nothing.
 *
 * NEVER MANUFACTURE A NUMBER. A primitive draws only what it is handed; a
 * caller that has no source passes nulls or does not draw the chart, and
 * records the missing read for Session 2.
 *
 * ---------------------------------------------------------------------------
 * 5. AXES AND LABELS.
 *
 *   12px minimum (--nf-text-overline), tabular figures on every axis tick
 *   and table cell. Large standalone figures stay proportional (Figure).
 *   Y ticks are clean round numbers from `axisTicks` (0 and two or three
 *   steps), formatted by the caller (money through formatMoneyGlance).
 *   X ticks: the first, the last, and every nth between that does not crowd
 *   the last (`showEvery`). Type is HTML, never SVG text, so it never
 *   stretches with the drawing.
 *   Gridlines are solid 1px hairlines in --nf-chart-grid, never dashed.
 *   The one dashed rule is a promise line (a target the product keeps).
 *
 * ---------------------------------------------------------------------------
 * 6. TOOLTIP (touch and keyboard).
 *
 *   Pointer: the whole column (bars) or the nearest point by x (lines) is
 *   the hit target, never the painted pixels. Touch: a tap shows the readout
 *   and it stays until the next tap or focus leaves. Keyboard: the plot is
 *   one tab stop; Left and Right walk the periods, Home and End jump, Escape
 *   clears. The readout is mirrored into a polite live region, so a screen
 *   reader hears the same value a sighted reader sees. Values lead (strong),
 *   the period follows (muted). The tooltip wears the inverse pair
 *   (--nf-surface-inverse, --nf-content-inverse) so it stands off the card in
 *   both themes.
 *
 * ---------------------------------------------------------------------------
 * 7. MOTION (north star motions 4, 5, 15; MOTION_SYSTEM "Figures and data").
 *
 *   line draw      620ms glide (--nf-ease-standard), a clip that unrolls
 *                  left to right (transform only)
 *   bars grow      from the baseline, 620ms glide, staggered 30ms
 *   period morph   380ms glide: bars translate to their new height, a line's
 *                  points interpolate
 *   active dim     160ms opacity on the bars not under the pointer
 *   reduced motion everything is simply there (prefers-reduced-motion, and
 *                  the product's Calm and Off settings)
 *
 * Pure SVG and CSS. No chart library, ever (the reasons are in
 * `TimeSeries.tsx` and still hold). Styles live in `app/css/charts.css`,
 * imported by each component that draws one.
 */

/** A bucket on a period axis. Built on the server, drawn on the client. */
export type VizPoint = {
  /** Stable across renders, so a period switch morphs rather than remounts. */
  key: string;
  /** The short axis label ("Jun"). */
  tick: string;
  /** The full name for the readout and the table ("June 2026"). */
  label: string;
  /** The measured value. `null` is "nothing on record", never zero. */
  value: number | null;
  /** The value as the reader should see it ("N52,000"). Required when `value` is a number. */
  display?: string;
};

export type AxisTick = { value: number; label: string };

/**
 * A clean step: 1, 2, 2.5 or 5 times a power of ten, the smallest that
 * covers `raw`. Axis ticks read as round numbers or they are not read.
 */
export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10;
  return nice * power;
}

/**
 * The y axis for a series whose largest value is `max`: zero, then `steps`
 * clean rungs (three by default), the top one at or above `max`. Integer steps only when the
 * data is whole numbers, so a count axis never reads "2.5 requests".
 * `format` turns each value into its label (money, a count); it runs on the
 * server, which is why the ticks arrive at a client chart already printed.
 */
export function axisTicks(
  max: number,
  format: (value: number) => string,
  steps = 3,
  integer = true,
): AxisTick[] {
  const top = Number.isFinite(max) && max > 0 ? max : 0;
  if (top === 0) return [{ value: 0, label: format(0) }];
  let step = niceStep(top / steps);
  if (integer) step = Math.max(1, Math.ceil(step));
  const ticks: AxisTick[] = [];
  for (let v = 0; v < top + step; v += step) {
    ticks.push({ value: v, label: format(v) });
    if (v >= top) break;
  }
  return ticks;
}

/**
 * Whether the tick at `i` of `count` gets its label: the first, the last,
 * and every `every`th between, dropping one that would crowd the last.
 */
export function showEvery(i: number, count: number, every: number): boolean {
  const last = count - 1;
  if (i === 0 || i === last) return true;
  if (every <= 1) return true;
  if (i % every !== 0) return false;
  return last - i >= Math.max(2, Math.ceil(every / 2));
}

/** How many labels fit: one per ~44px of a 320px plot, the phone floor. */
export function tickEveryFor(count: number, fit = 7): number {
  return count <= fit ? 1 : Math.ceil(count / fit);
}

/** The longest tick label, which sizes the y axis column. */
export function widest(ticks: readonly AxisTick[]): string {
  return ticks.reduce((w, t) => (t.label.length > w.length ? t.label : w), "");
}

/** The top of the scale: the highest tick, the highest value, never below 1. */
export function scaleTop(points: readonly { value: number | null }[], ticks: readonly AxisTick[]): number {
  const values = points.map((p) => p.value ?? 0);
  return Math.max(1, ...values, ...ticks.map((t) => t.value));
}

/** True when nothing in the series is on record (all null, or no points). */
export function allAbsent(points: readonly { value: number | null }[]): boolean {
  return points.every((p) => p.value === null);
}

/** The index of the largest recorded value, or -1 when there is none. */
export function peakIndex(points: readonly { value: number | null }[]): number {
  let best = -1;
  let bestValue = -Infinity;
  points.forEach((p, i) => {
    if (p.value !== null && p.value > bestValue) {
      best = i;
      bestValue = p.value;
    }
  });
  return best;
}

/**
 * The index the arrow keys arrive at from `from`, clamped to the series.
 * Null `from` starts at the last point, which is "now" on every period axis.
 */
export function stepIndex(from: number | null, key: string, count: number): number | null {
  if (count === 0) return null;
  const start = from ?? count - 1;
  switch (key) {
    case "ArrowLeft":
    case "ArrowDown":
      return Math.max(0, start - 1);
    case "ArrowRight":
    case "ArrowUp":
      return Math.min(count - 1, start + 1);
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return from;
  }
}

/**
 * Resample `from` onto `length` points by linear interpolation of index, so
 * a line can morph between periods of different lengths (7 days to 30)
 * without a point appearing from nowhere. Nulls are carried as the nearest
 * recorded value for the drawing only; the table and readout never see it.
 */
export function resample(from: readonly number[], length: number): number[] {
  if (length <= 0) return [];
  if (from.length === 0) return Array.from({ length }, () => 0);
  if (from.length === 1) return Array.from({ length }, () => from[0]!);
  return Array.from({ length }, (_, i) => {
    const at = length === 1 ? 0 : (i / (length - 1)) * (from.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(from.length - 1, lo + 1);
    const f = at - lo;
    return from[lo]! * (1 - f) + from[hi]! * f;
  });
}

/** The glide curve (`--nf-ease-standard`, 0.22 0.61 0.36 1) for script-driven morphs. */
export function glide(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  /* Solve the cubic bezier for x by Newton steps, then return y. */
  const [x1, y1, x2, y2] = [0.22, 0.61, 0.36, 1];
  const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u ** 2 * (1 - u) + u ** 3;
  const by = (u: number) => 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u ** 2 * (1 - u) + u ** 3;
  const dx = (u: number) =>
    3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u ** 2;
  let u = x;
  for (let k = 0; k < 6; k++) {
    const d = dx(u);
    if (Math.abs(d) < 1e-6) break;
    u -= (bx(u) - x) / d;
    u = Math.min(1, Math.max(0, u));
  }
  return by(u);
}

/** The morph's length, MOTION_SYSTEM "Chart morph between periods". */
export const MORPH_MS = 380;
