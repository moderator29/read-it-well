import { CHART_INK, CHART_SERIES, rampAlpha } from "./palette";

/**
 * Horizontal bars, one series, sorted by magnitude and coloured by rank on the
 * one blue family's sequential ramp.
 *
 * WHY HORIZONTAL AND NOT VERTICAL. The categories here are words of unequal
 * and sometimes considerable length ("listing_review_decision", a person's
 * display name), and a vertical bar chart puts those words on the x axis where
 * they either rotate, truncate or collide. Horizontal gives every label a full
 * line of its own at the type scale, which is also why this is HTML and CSS
 * rather than SVG: the label is type, the bar is a rectangle, and neither one
 * needs a drawing surface to be either of those things.
 *
 * WHY THE RAMP AND NOT FOUR HUES. See `palette.ts`. A four slot categorical
 * palette cannot be built inside our colour law, the failure is measured, and
 * a sequential ramp is in any case the correct encoding for the question these
 * bars answer, which is always "how many" and never "which one".
 *
 * DIRECT LABELS, NEVER A LEGEND. Each row names itself and carries its own
 * number, so identity is never colour alone and there is nothing for a legend
 * to add.
 */

export type Bar = {
  /** The category, already in the reader's language. */
  label: string;
  count: number;
};

export function Bars({
  bars,
  /** Names the set. Rendered by the caller's heading, used for the a11y name. */
  label,
  /** Rows beyond this fold into one honest "everything else" row. */
  limit = 8,
  restLabel,
  className,
}: {
  bars: Bar[];
  label: string;
  limit?: number;
  /** The word for the folded row. Required when `bars` can exceed `limit`. */
  restLabel?: string;
  className?: string;
}) {
  if (bars.length === 0) return null;

  const sorted = [...bars].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, limit);
  const tail = sorted.slice(limit);
  /*
   * A NINTH SERIES IS NEVER A NEW COLOUR. The tail folds into one row whose
   * label says so and whose count is the real sum, rather than the chart
   * growing a colour it has no right to or silently dropping rows, which
   * would make the bars add up to less than the total printed above them.
   */
  const rows =
    tail.length > 0 && restLabel
      ? [...head, { label: restLabel, count: tail.reduce((s, b) => s + b.count, 0) }]
      : head;

  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <ul
      aria-label={label}
      className={["m-0 flex list-none flex-col gap-xs p-0", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      {rows.map((row, i) => (
        <li key={`${row.label}-${i}`} className="min-w-0">
          <div className="flex items-baseline justify-between gap-sm">
            {/* min-w-0 plus truncate: freeing the track is not freeing the
                item, and a long action name is exactly the case that proves
                it. Same sentence as `Segmented`. */}
            <span className="min-w-0 truncate text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
              {row.label}
            </span>
            <span className="nf-numeric shrink-0 text-[var(--nf-text-caption)] text-[var(--nf-content-primary)]">
              {row.count}
            </span>
          </div>
          {/* The track is the well, the bar sits in it. A 4px radius on a 8px
              bar is 0.5, which is a capsule, so the bar takes 2px: it is a
              SHAPE rather than a control and the law does not reach it, but a
              bar that reads as a pill also reads as a control, so it does not
              get to be one. */}
          <div
            aria-hidden="true"
            className="mt-3xs h-[8px] w-full overflow-hidden rounded-[2px]"
            style={{ background: CHART_INK.track }}
          >
            <div
              className="h-full rounded-[2px]"
              /* One ink, position carried by alpha. See `palette.ts`: five
                 rung tokens would pin this component to five colours rather
                 than to one meaning, and the ramp would stop following a
                 retune the day the accent family moved. */
              style={{
                width: `${Math.max(2, (row.count / max) * 100)}%`,
                background: CHART_SERIES,
                opacity: rampAlpha(i),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
