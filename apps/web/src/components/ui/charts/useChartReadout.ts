"use client";

import { useCallback, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";
import { stepIndex } from "./chart-rules";

/**
 * THE READOUT'S STATE, shared by every interactive chart (chart rule 6).
 *
 * One index, three ways in:
 *
 *   mouse and pen   the index under the pointer, by x, across the whole plot
 *                   (the hit target is the column, never the painted mark);
 *                   leaving the plot clears it.
 *   touch           a tap picks the index and it STAYS, because a finger
 *                   cannot hover: the readout would vanish the instant the
 *                   finger lifted. Tapping the same index again clears it.
 *   keyboard        the plot is one tab stop. Focus lands on `rest` (the
 *                   emphasised period, or the last), arrows walk, Home and
 *                   End jump, Escape clears, blur clears.
 *
 * `bucketed` says how x maps to an index: bars own an equal slice each
 * (floor), points on a line sit on the slice edges (round).
 */
export function useChartReadout(count: number, rest: number | null, bucketed: boolean) {
  const [active, setActive] = useState<number | null>(null);

  const indexAt = useCallback(
    (event: PointerEvent<HTMLElement>): number => {
      const box = event.currentTarget.getBoundingClientRect();
      const fraction = box.width > 0 ? Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)) : 0;
      if (count <= 1) return 0;
      return bucketed
        ? Math.min(count - 1, Math.floor(fraction * count))
        : Math.round(fraction * (count - 1));
    },
    [count, bucketed],
  );

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    setActive(indexAt(event));
  };
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") return;
    const at = indexAt(event);
    setActive((now) => (now === at ? null : at));
  };
  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    setActive(null);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setActive((now) => stepIndex(now ?? rest, event.key, count));
  };
  const onFocus = (event: FocusEvent<HTMLElement>) => {
    /* Only a keyboard arrival lands on the rest index; a tap focuses too, and
       its pointerdown has already chosen. */
    let keyboard = true;
    try {
      keyboard = event.currentTarget.matches(":focus-visible");
    } catch {
      /* A browser without :focus-visible: treat every focus as a keyboard one. */
    }
    if (keyboard) setActive((now) => now ?? rest ?? count - 1);
  };
  const onBlur = () => setActive(null);

  return {
    active,
    setActive,
    handlers: { onPointerMove, onPointerDown, onPointerLeave, onKeyDown, onFocus, onBlur },
  };
}
