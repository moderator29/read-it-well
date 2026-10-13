"use client";

import { useState, type CSSProperties } from "react";
import { planOdometer } from "@/lib/motion/odometer";

/**
 * THE ODOMETER: A FIGURE THAT CHANGES WHILE YOU LOOK AT IT (Session 3; north
 * star motion 5, MOTION_SYSTEM.md "Odometer change"; reference 7065).
 *
 * Each digit that changed rolls to its new value, `land` 380ms, staggered 20ms
 * left to right; the digits that did not change do not move. Tabular, so the
 * figure's width never jumps while the wheels turn. The CSS is `.nf-odo` in
 * `app/css/motion-kit.css`, and reduced motion, Calm and Off land the new
 * figure at once.
 *
 * WHAT IT DOES NOT DECIDE IS WHEN. It rolls whenever `value` changes and at
 * no other time: not on mount, not on a re-render with the same value. A
 * money figure must only change when the server has confirmed the money moved
 * (MOTION_SYSTEM.md, "a balance never animates optimistically"), and that
 * decision belongs to the caller, which passes the confirmed figure and
 * nothing else. An odometer turning on an optimistic balance is a lie told in
 * motion.
 *
 *   value      the figure as printed, already formatted (`formatMoney`,
 *              `Intl.NumberFormat`): this component never formats.
 *   from       optional: the figure to roll FROM, when the caller knows it
 *              better than the last render did.
 *   className  size and weight.
 *
 * A screen reader hears the final figure only.
 */
export function Odometer({ value, from, className }: { value: string; from?: string; className?: string }) {
  /*
   * The last figure shown and the one before it, kept in state and updated
   * DURING render when the prop moves (React's "adjusting state when a prop
   * changes" pattern), so the roll is planned in the same render that shows
   * the new figure and there is no frame of the new digits standing still.
   * `turn` keys the cells, so each change mounts fresh wheels and a re-render
   * with the same value restarts nothing.
   */
  /* Mounted with a `from` that differs, it rolls once from it at once (a
     caller that swapped this in for a moment to show a confirmed change). */
  const [shown, setShown] = useState(() => ({
    value,
    from: from ?? value,
    turn: from !== undefined && from !== value ? 1 : 0,
  }));
  if (shown.value !== value) {
    setShown({ value, from: from ?? shown.value, turn: shown.turn + 1 });
  }

  const { cells, direction } = planOdometer(shown.turn === 0 ? value : shown.from, value);
  return (
    <span className={["nf-odo nf-numeric", className ?? ""].filter(Boolean).join(" ")}>
      <span aria-hidden="true" className="nf-odo__figure" data-direction={direction} key={shown.turn}>
        {cells.map((cell, index) =>
          cell.order === undefined ? (
            <span key={index}>{cell.char}</span>
          ) : (
            <span key={index} className="nf-odo__cell" style={{ "--nf-odo-i": cell.order } as CSSProperties}>
              {/* The resting digit holds the cell's size; the wheel turns over it. */}
              <span className="nf-odo__rest">{cell.char}</span>
              <span className="nf-odo__wheel">
                {direction === "up" ? (
                  <>
                    <span>{cell.from || " "}</span>
                    <span>{cell.char}</span>
                  </>
                ) : (
                  <>
                    <span>{cell.char}</span>
                    <span>{cell.from || " "}</span>
                  </>
                )}
              </span>
            </span>
          ),
        )}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
