import { STATUS_FILL, type StatusKey } from "./palette";

/**
 * One stacked bar, carrying the composition of a queue by status.
 *
 * THIS IS THE ONE CHART ON THE CONSOLE THAT USES MORE THAN ONE HUE, and it is
 * allowed to because it is not a categorical palette. It is the RESERVED
 * status four, which already means these four things everywhere else in the
 * product, and it ships with a word and a count beside every colour, which is
 * the condition that makes it legible to a reader who cannot separate rose
 * from emerald. Measured on the console's dark surface, that pair is
 * deuteranope delta E 8.2: over the floor, but only just, and only because of
 * the words. Remove the legend and this chart stops being honest.
 *
 * A 2px gap of the SURFACE between segments, not a lighter stroke: a gap is
 * how the eye separates two fills without a third colour arriving to do it.
 *
 * NOT A DONUT. A donut of four parts asks the reader to compare angles; a
 * single stacked bar asks them to compare lengths along one line, which people
 * do better. The donut in `components/agent/charts` stays where it is, for the
 * two-slot question it already answers.
 */

export type StatusSegment = {
  status: StatusKey;
  /** Already in the reader's language. The colour is never the only signal. */
  label: string;
  count: number;
};

export function StatusBar({
  segments,
  label,
  className,
}: {
  segments: StatusSegment[];
  /** Names the whole bar for a screen reader. */
  label: string;
  className?: string;
}) {
  const shown = segments.filter((s) => s.count > 0);
  /*
   * An all-zero queue draws no bar. A full-width empty track with four zeroes
   * under it is a picture of a composition that does not exist; the desk's own
   * empty state is the honest answer and it already exists.
   */
  if (shown.length === 0) return null;

  const total = shown.reduce((sum, s) => sum + s.count, 0);

  return (
    <figure className={["m-0", className ?? ""].filter(Boolean).join(" ")}>
      <div
        role="img"
        aria-label={`${label}: ${shown.map((s) => `${s.label} ${s.count}`).join(", ")}, ${total} in total.`}
        /* `gap-3xs` IS 2px on the scale. The 2px separator between two fills
           is a mark spec rather than a layout choice, and it happens to be
           exactly the hairline rung the scale already carries, so it takes the
           rung rather than being typed out beside it. */
        className="flex h-[14px] w-full gap-3xs overflow-hidden rounded-[3px]"
      >
        {shown.map((s) => (
          <span
            key={s.status}
            /* `flexGrow` rather than a percentage width, so the gaps come out
               of the track rather than pushing the last segment past the end
               of it. */
            style={{ flexGrow: s.count, flexBasis: 0, background: STATUS_FILL[s.status] }}
          />
        ))}
      </div>

      {/* The legend is not optional here. See the note at the top. */}
      <figcaption className="mt-xs flex flex-wrap gap-x-md gap-y-2xs">
        {shown.map((s) => (
          <span
            key={s.status}
            className="inline-flex items-center gap-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]"
          >
            <span
              aria-hidden="true"
              className="block size-[8px] shrink-0 rounded-[2px]"
              style={{ background: STATUS_FILL[s.status] }}
            />
            {s.label}
            <span className="nf-numeric text-[var(--nf-content-secondary)]">{s.count}</span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
