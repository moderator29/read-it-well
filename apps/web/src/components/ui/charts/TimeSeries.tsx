import { CHART_INK, CHART_SERIES } from "./palette";

/**
 * One series over days. The console's change-over-time chart.
 *
 * NO CHARTING DEPENDENCY, and the reasoning is measured rather than
 * nostalgic. Every console page is a server component today; every popular
 * charting library's chart is a client component, so adopting one turns each
 * charted desk into a client boundary and ships the desk's data twice, once
 * as HTML and once as the RSC payload for hydration. Our theme lives in CSS
 * custom properties that change under `[data-theme="light"]`, and an SVG
 * `stroke="var(--nf-brand-primary)"` follows that with no JavaScript, while a
 * canvas library has to resolve the property in JS on the client, which is a
 * flash of the wrong colour and a theme listener per chart. And every one of
 * them ships a categorical default containing the four banned hues. This is
 * about 2KB and has none of those properties.
 *
 * ONE Y AXIS, EVER. There is no second series parameter and there is not
 * going to be one: two measures of different scale are two charts. That is
 * the single most common charting mistake and the cheapest way to not make it
 * is to build a component that cannot express it.
 *
 * NO LEGEND, and that is correct rather than an omission: identity is never
 * colour alone, and with one series the title names it. A legend box for one
 * series is furniture.
 *
 * DETERMINISTIC GEOMETRY. Every number below is computed from the data, so
 * the server render and the client render are byte-identical and React has
 * nothing to reconcile. `AreaSparkline` established this and it is kept.
 */

export type TimePoint = {
  /** An ISO day, `YYYY-MM-DD`. Used for the axis label and the accessible row. */
  day: string;
  count: number;
};

export function TimeSeries({
  points,
  label,
  /** Said under the chart when the read behind it is capped. Honest or absent. */
  caveat,
  height = 180,
  className,
}: {
  points: TimePoint[];
  /** Names the series. This is the legend. */
  label: string;
  caveat?: string;
  height?: number;
  className?: string;
}) {
  /*
   * A CHART OF NOTHING SAYS NOTHING. With no points there is no line to draw
   * and an empty axis frame is a picture of data that does not exist, which
   * is the same defect as an invented trend with the sign reversed. The
   * caller owns the words; this owns the refusal to draw.
   */
  if (points.length === 0) return null;

  const w = 640;
  const h = height;
  const padX = 10;
  const padTop = 12;
  /* Room under the plot for the two end labels, which are the only x labels:
     a number under every point is the anti-pattern this avoids. */
  const padBottom = 22;

  const max = Math.max(...points.map((p) => p.count), 1);
  const plotH = h - padTop - padBottom;
  const span = points.length > 1 ? points.length - 1 : 1;

  const pts = points.map((p, i) => {
    const x = padX + (points.length > 1 ? (i / span) * (w - padX * 2) : (w - padX * 2) / 2);
    const y = padTop + plotH - (p.count / max) * plotH;
    return [x, y] as const;
  });

  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const floor = padTop + plotH;
  const area = `${line} L${pts[pts.length - 1]![0].toFixed(1)} ${floor} L${pts[0]![0].toFixed(1)} ${floor} Z`;
  /* A gradient id has to be unique on the page or the second chart borrows the
     first one's fill. `AreaSparkline` hardcodes `nf-spark-fill` and collides
     for exactly this reason; here the id is derived from the label, which is
     already required to be distinct because it is what names the series. */
  const fillId = `nf-ts-${label.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;

  const first = points[0]!;
  const last = points[points.length - 1]!;
  const peak = points.reduce((a, b) => (b.count > a.count ? b : a), first);

  return (
    <figure className={["m-0", className ?? ""].filter(Boolean).join(" ")}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`${label}. ${describe(points)}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "auto", maxHeight: h }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_SERIES} stopOpacity="0.30" />
            <stop offset="100%" stopColor={CHART_SERIES} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* The baseline, recessive. No horizontal grid: with one series and a
            peak label the reader never has to measure a middle value. */}
        <line
          x1={padX}
          y1={floor}
          x2={w - padX}
          y2={floor}
          stroke={CHART_INK.axis}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${fillId})`} />
        <path
          d={line}
          fill="none"
          stroke={CHART_SERIES}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          /* Keeps the 2px weight under the non-uniform aspect this svg is
             stretched to. Without it the stroke is scaled with the box and the
             line reads as a different weight on every card width. */
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="3.5" fill={CHART_SERIES} />
      </svg>

      {/*
        THE LABELS ARE HTML AND NOT SVG TEXT, deliberately. `preserveAspectRatio
        = "none"` stretches the drawing to the card's width, and it would
        stretch any text inside it with the same factor: the same chart would
        carry differently proportioned type on a phone and on a desktop. Type
        stays on the type scale by staying out of the drawing.

        Two labels and a peak, never a number under every point.
      */}
      <figcaption className="mt-2xs flex items-baseline justify-between gap-sm text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
        <span className="nf-numeric">{first.day}</span>
        <span>
          {label}
          {" · "}
          <span className="nf-numeric text-[var(--nf-content-secondary)]">
            {peak.count} on {peak.day}
          </span>
        </span>
        <span className="nf-numeric">{last.day}</span>
      </figcaption>

      {caveat ? (
        <p className="mt-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {caveat}
        </p>
      ) : null}
    </figure>
  );
}

/** The chart in a sentence, for a reader who cannot see it. */
function describe(points: TimePoint[]): string {
  const total = points.reduce((sum, p) => sum + p.count, 0);
  const peak = points.reduce((a, b) => (b.count > a.count ? b : a), points[0]!);
  return `${total} in total across ${points.length} days, most on ${peak.day} with ${peak.count}.`;
}
