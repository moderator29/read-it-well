"use client";

import { useEffect, type RefObject } from "react";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * GET STARTED'S LIVING DEPTH: TILT AND PULL (MOTION_SYSTEM.md section 4).
 *
 * Two inputs, written as three custom properties on the stage and nothing
 * else, so every movement is the stylesheet's (transform only) and this file
 * never touches layout:
 *
 *   --nf-tx, --nf-ty   the device's tilt (or a desktop pointer's place), each
 *                      -1 to 1. `get-started.css` multiplies them by each
 *                      layer's parallax ratio (0.3, 0.45, 0.6, 1.0) and by
 *                      the 6px ceiling, so the furthest layer moves least.
 *   --nf-pull          a pull down past the top, in pixels but written as a
 *                      plain number (the stylesheet multiplies it into px and
 *                      into a scale), already at 0.6 of the drag and capped,
 *                      stretching the wash and the mark.
 *                      On release it goes back to 0 and the stylesheet
 *                      settles it on the `drift` curve.
 *
 * GATES. Nothing listens under reduced motion, Calm or Off, or with data
 * saver on: the screen is simply still, which is the answer the motion system
 * gives for both. iOS asks permission for orientation and only from a tap, so
 * the tilt is never requested: where the event arrives unasked (Android, most
 * desktops with a pointer instead) it is used, and where it does not the
 * screen is still. A permission prompt on the first screen of the product
 * would be a strange first thing to ask somebody.
 *
 * One write per frame at most (requestAnimationFrame), passive listeners
 * only, and everything is removed on unmount.
 */
export const TILT_DEGREES = 18;
export const PULL_RATIO = 0.6;
export const PULL_MAX = 96;

/** A tilt in degrees to -1..1, clamped: 18 degrees either way is the full 6px. */
export function tiltUnit(degrees: number | null | undefined): number {
  if (typeof degrees !== "number" || !Number.isFinite(degrees)) return 0;
  return Math.max(-1, Math.min(1, degrees / TILT_DEGREES));
}

/** A downward drag in pixels to the stretch the stylesheet draws. */
export function pullFor(dragPx: number): number {
  if (!(dragPx > 0)) return 0;
  return Math.min(PULL_MAX, Math.round(dragPx * PULL_RATIO));
}

function dataSaver(): boolean {
  return document.documentElement.dataset.saveData === "on";
}

export function useStageMotion(stage: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = stage.current;
    if (!el || motionQuiet() || dataSaver()) return;

    let frame = 0;
    let tx = 0;
    let ty = 0;
    let pull = 0;
    const flush = () => {
      frame = 0;
      el.style.setProperty("--nf-tx", tx.toFixed(3));
      el.style.setProperty("--nf-ty", ty.toFixed(3));
      el.style.setProperty("--nf-pull", String(pull));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    /* The tilt: gamma is left and right, beta forward and back, measured
       from the way a phone is held (about 40 degrees from flat). */
    const onOrientation = (event: DeviceOrientationEvent) => {
      tx = tiltUnit(event.gamma);
      ty = tiltUnit(event.beta === null ? null : event.beta - 40);
      schedule();
    };
    /* A desktop pointer stands in for the tilt: the same ratios, the same
       ceiling. A touch is a pull, not a tilt, so only a fine pointer counts. */
    const fine = window.matchMedia?.("(pointer: fine)").matches ?? false;
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      tx = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth) * 2 - 1));
      ty = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight) * 2 - 1));
      schedule();
    };

    /* The pull: only from the top of the page, only downward. */
    let startY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      startY = window.scrollY <= 0 ? (event.touches[0]?.clientY ?? null) : null;
      el.dataset.pulling = "";
    };
    const onTouchMove = (event: TouchEvent) => {
      if (startY === null) return;
      const y = event.touches[0]?.clientY;
      if (typeof y !== "number") return;
      pull = pullFor(y - startY);
      schedule();
    };
    const onTouchEnd = () => {
      startY = null;
      delete el.dataset.pulling;
      pull = 0;
      schedule();
    };

    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("pointermove", onPointer);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [stage]);
}
