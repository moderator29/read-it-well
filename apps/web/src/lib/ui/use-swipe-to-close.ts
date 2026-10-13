"use client";

import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

/**
 * Swipe a left-hand drawer shut (F-15).
 *
 * The side drawer could be closed by the scrim, Escape and the Android back
 * button, but not by the gesture every phone drawer answers to: dragging it
 * back towards the edge it came from. This is that gesture and nothing else.
 * It paints nothing of its own: while a finger drags, the panel follows it
 * through the independent `translate` property (the open animation owns
 * `transform`, and an animation outranks an inline style on the property it
 * animates), and on release it either closes or springs back to where it was.
 *
 * The maths mirrors `components/ui/Sheet.tsx`: the axis is decided after a few
 * pixels so a vertical scroll of the drawer's rows is never taken over, and
 * the release closes on distance OR on velocity, so a quick flick works as
 * well as a long drag.
 */

/** Movement, in px, before the gesture decides whether it is a swipe or a scroll. */
const AXIS_SLOP = 8;
/** A flick this fast towards the edge closes whatever the distance, px per ms. */
const FLICK_VELOCITY = 0.5;
/** Past this share of the panel's width, a release closes. */
const DISTANCE_SHARE = 0.35;

/**
 * Whether a release should close the drawer. `dx` is the drag so far (negative
 * is towards the left edge), `velocity` the last measured speed in px per ms
 * (negative is leftwards), `width` the panel's width.
 */
export function swipeCloses(dx: number, velocity: number, width: number): boolean {
  if (dx >= 0) return false;
  if (velocity <= -FLICK_VELOCITY) return true;
  return width > 0 && -dx > width * DISTANCE_SHARE;
}

type Drag = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastT: number;
  v: number;
  dx: number;
  /** null until the axis is decided. */
  horizontal: boolean | null;
};

export function useSwipeToClose(onClose: () => void) {
  const drag = useRef<Drag | null>(null);
  /** Set when a drag ends, so the click that follows it is not a tap on a row. */
  const swallowClick = useRef(false);

  const settle = useCallback((panel: HTMLElement, to: "open" | "closed") => {
    if (to === "closed") {
      onClose();
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      panel.style.transition = "translate var(--nf-duration-fast) var(--nf-ease-entrance)";
      panel.addEventListener(
        "transitionend",
        () => {
          panel.style.transition = "";
        },
        { once: true },
      );
    }
    panel.style.translate = "";
  }, [onClose]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    /* Touch and pen only: a mouse drag on a desktop-sized window is text
       selection, and the drawer is phone chrome (it is `lg:hidden`). */
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    drag.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastT: e.timeStamp,
      v: 0,
      dx: 0,
      horizontal: null,
    };
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.horizontal === null) {
      if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
      d.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!d.horizontal) {
        /* A scroll. Hand it back to the browser and stop listening. */
        drag.current = null;
        return;
      }
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    /* Only towards the edge it came from; the other way it is already open. */
    d.dx = Math.min(0, dx);
    e.currentTarget.style.transition = "";
    e.currentTarget.style.translate = `${d.dx}px 0`;
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.id !== e.pointerId || !d.horizontal) return;
      swallowClick.current = true;
      window.setTimeout(() => {
        swallowClick.current = false;
      }, 0);
      const panel = e.currentTarget;
      const width = panel.getBoundingClientRect().width;
      settle(panel, swipeCloses(d.dx, d.v, width) ? "closed" : "open");
    },
    [settle],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const d = drag.current;
      drag.current = null;
      if (d?.horizontal) settle(e.currentTarget, "open");
    },
    [settle],
  );

  const onClickCapture = useCallback((e: ReactMouseEvent) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    /* Vertical scrolling and pinch stay the browser's; a horizontal drag
       comes to the handlers above instead of being claimed as a pan. */
    style: { touchAction: "pan-y pinch-zoom" } as const,
  };
}
