import { STATUS_FILL, TONE_FILL, type ChartTone, type StatusKey } from "./palette";

/**
 * One segmented bar carrying the composition of a whole: a queue by status,
 * a move-in total by line, a day by priority. Restyled for the clean
 * unified sweep (29 September 2026; `docs/design/CLEAN_UNIFIED_DIRECTION.md`
 * section 9, reference 31's top card): a 6px bar of rounded segments with
 * 4px gaps, and a legend of dots, words and figures under it.
 *
 * THE LEGEND IS NOT OPTIONAL. Each segment carries a state or brand tint,
 * and the word and figure beside every dot are what make it legible to a
 * reader who cannot separate two hues. Remove the legend and this chart
 * stops being honest.
 *
 * NOT A DONUT: one line of lengths is read better than angles.
 *
 * MOTION (plan item 26): the segments grow from the left, 620ms on the
 * entrance curve, 40ms apart, and the legend fades in from 300ms; the
 * classes are in `app/css/controls.css` ("THE CLEAN UNIFIED DATA
 * PRIMITIVES"). Under reduced motion, Calm and Off the full bar is simply
 * there.
 *
 * A segment names its colour by `status` (the reserved status four of the
 * console) or by `tone` (brand, success, warning, error, info, neutral).
 * `display` prints beside the word in place of the count ("N2,800,000").
 */
export type StatusBarTone = ChartTone;

export type StatusSegment = {
  /** A stable key; defaults to the status or the label. */
  key?: string;
  status?: StatusKey;
  tone?: StatusBarTone;
  /** Already in the reader's language. The colour is never the only signal. */
  label: string;
  count: number;
  /** What the legend prints for this part, when it is not the bare count. */
  display?: string;
};


function fill(s: StatusSegment): string {
  if (s.tone) return TONE_FILL[s.tone];
  if (s.status) return STATUS_FILL[s.status];
  return TONE_FILL.brand;
}

export function StatusBar({
  segments,
  label,
  legend = true,
  animate = true,
  className,
}: {
  segments: StatusSegment[];
  /** Names the whole bar for a screen reader. */
  label: string;
  /** Only a caller that prints the same words and figures itself turns it off. */
  legend?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const shown = segments.filter((s) => s.count > 0);
  /*
   * An all-zero whole draws no bar. A full-width empty track with zeroes
   * under it is a picture of a composition that does not exist.
   */
  if (shown.length === 0) return null;

  const total = shown.reduce((sum, s) => sum + s.count, 0);

  return (
    <figure className={["nf-statusbar", animate ? "nf-statusbar--grow" : "", className ?? ""].filter(Boolean).join(" ")}>
      <div
        role="img"
        aria-label={`${label}: ${shown.map((s) => `${s.label} ${s.display ?? s.count}`).join(", ")}.`}
        className="nf-statusbar__track"
        data-total={total}
      >
        {shown.map((s, i) => (
          <span
            key={s.key ?? s.status ?? s.label}
            className="nf-statusbar__seg"
            /* `flexGrow` rather than a percentage width, so the gaps come out
               of the track rather than pushing the last segment past it. */
            style={{
              flexGrow: s.count,
              flexBasis: 0,
              background: fill(s),
              animationDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>

      {legend ? (
        <figcaption className="nf-statusbar__legend">
          {shown.map((s) => (
            <span key={s.key ?? s.status ?? s.label} className="nf-statusbar__item">
              <span aria-hidden="true" className="nf-statusbar__dot" style={{ background: fill(s) }} />
              <span className="nf-numeric nf-statusbar__figure">{s.display ?? s.count}</span>
              {s.label}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
