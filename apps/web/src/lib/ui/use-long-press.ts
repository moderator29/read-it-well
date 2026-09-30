"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { feedback } from "@/lib/ui/feedback";

/** How long a finger holds before the menu opens: the platforms' own feel. */
export const LONG_PRESS_MS = 480;
/** A finger that travels further than this is scrolling or swiping photos. */
export const LONG_PRESS_SLOP_PX = 10;

/**
 * A long press on a touch screen, and the context-menu gesture where the
 * device has one (Android's own long press on a link fires it). The desktop
 * right click is left to the browser, where "open in a new tab" lives.
 *
 * Spread `handlers` on the element; `holding` is true from a moment into the
 * hold, for the card to sink a little so the hold is felt before it fires.
 * The click that ends a fired press is swallowed (capture phase), so letting
 * go does not also open the listing.
 */
export function useLongPress(onLongPress: () => void, options: { disabled?: boolean } = {}) {
  const timer = useRef<number | null>(null);
  const holdTimer = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [holding, setHolding] = useState(false);
  const latest = useRef(onLongPress);
  useEffect(() => {
    latest.current = onLongPress;
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    timer.current = null;
    holdTimer.current = null;
    start.current = null;
    setHolding(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const fire = useCallback(() => {
    cancel();
    fired.current = true;
    feedback("select");
    latest.current();
  }, [cancel]);

  /* React carries events up through portals, so a press inside the sheet
     this opens would reach the card that opened it. Only the element's own
     DOM counts. */
  const own = (event: { currentTarget: HTMLElement; target: EventTarget }) =>
    event.currentTarget.contains(event.target as Node);

  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!own(event)) return;
      fired.current = false;
      if (options.disabled || event.pointerType === "mouse" || !event.isPrimary) return;
      start.current = { x: event.clientX, y: event.clientY };
      holdTimer.current = window.setTimeout(() => setHolding(true), 160);
      timer.current = window.setTimeout(fire, LONG_PRESS_MS);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const s = start.current;
      if (!s) return;
      if (Math.hypot(event.clientX - s.x, event.clientY - s.y) > LONG_PRESS_SLOP_PX) cancel();
    },
    onPointerUp() {
      cancel();
      /* Some phones send no click after a held press; forget it shortly so
         the next ordinary tap is not swallowed. */
      if (fired.current) window.setTimeout(() => (fired.current = false), 400);
    },
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu(event: MouseEvent<HTMLElement>) {
      if (options.disabled || !own(event)) return;
      /* A mouse's right click keeps the browser's own menu. */
      const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
      if (!coarse) return;
      event.preventDefault();
      if (!fired.current) fire();
    },
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (!fired.current || !own(event)) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return { handlers, holding } as const;
}
