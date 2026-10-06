import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MotionValue, Transition } from "framer-motion";

/**
 * THE SPRINGS THE PORTED COMPONENTS SHARE (docs/design/MOTION_SYSTEM.md,
 * section 0 and the `drift` curve), written once so a gesture that settles in
 * one component settles the same way in the next.
 *
 * `--nf-ease-spring` is a cubic-bezier, which is right for a known track in CSS
 * and wrong for a gesture: a finger can let go anywhere, at any speed, and a
 * fixed curve cannot be interrupted or inherit velocity. framer-motion springs
 * can, so every gesture-driven settle in `DragToConfirm`, `SlidePagination`,
 * `InnerNav`, `BatchTray` and the `LiveIsland` morph uses one of these. Anything
 * on a known track with a known end (a fade, a hover, a chevron) stays CSS and
 * does not come through here.
 *
 *   SNAP     arriving somewhere decisively: a confirm landing at the end of its
 *            track, the pagination indicator reaching its page.
 *   SETTLE   the unhurried return: `drift`, a pull springing back, a tray
 *            released short of its threshold.
 *   GENTLE   a surface changing size: the island morphing, a panel opening.
 *
 * WHY THESE COMPONENTS DO NOT USE `m` ELEMENTS. The renderer that writes a
 * motion value into an `m` element's style lives in framer-motion's feature
 * bundles, and the platform loads none (D49.1: it cost 31KB gz per route for
 * no `m` element). So framer-motion here is the VALUE and SPRING ENGINE only
 * (`useMotionValue`, `useTransform`, `animate`, none of which needs a feature
 * bundle), and the small `useDrive` below writes the value into the element's
 * style itself. Open, visible and focusable are React state and CSS, never a
 * motion value, so every component is fully usable from its first frame. The
 * dom tests mount them exactly as production does, with no provider.
 *
 * Reduced motion: pass the result through `springFor(quiet, ...)` with the
 * answer from `useMotionGate()`, which collapses it to an instant jump. The
 * standalone `animate()` follows no global reduced-motion setting, which is why
 * this exists.
 */
export const SPRING_SNAP: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };
export const SPRING_SETTLE: Transition = { type: "spring", stiffness: 300, damping: 30, mass: 0.9 };
export const SPRING_GENTLE: Transition = { type: "spring", stiffness: 220, damping: 28, mass: 0.9 };

/**
 * The cubic-beziers of tokens.css as arrays, for the few framer transitions
 * that are timed rather than sprung. The names are the motion designer's
 * (MOTION_SYSTEM.md section 0): `land` is --nf-ease-entrance, `glide` is
 * --nf-ease-standard, `leave` is --nf-ease-exit.
 */
export const EASE_LAND = [0.16, 1, 0.3, 1] as const;
export const EASE_GLIDE = [0.22, 0.61, 0.36, 1] as const;
export const EASE_LEAVE = [0.4, 0, 1, 1] as const;

const INSTANT: Transition = { duration: 0 };

/**
 * The transition, or an instant jump for somebody who asked for stillness.
 * `MotionConfig reducedMotion` only switches off TRANSFORM animations (opacity
 * and height still play), and the standalone `animate()` ignores it entirely,
 * so every ported component asks the platform's own gate and decides here.
 */
export function springFor(quiet: boolean, transition: Transition): Transition {
  return quiet ? INSTANT : transition;
}

/** Clamp, for a position that must stay between two ends. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Write a motion value (or anything derived from one with `useTransform`) into
 * an element's style, on every change, with no dependency on framer-motion's
 * lazily loaded renderer. Returns the ref to put on the element.
 *
 * `write` must be a stable function (declare it at module level): it receives
 * the element and the new value and sets whatever style it likes, usually a
 * transform and an opacity. It runs once before paint with the current value,
 * so the first frame is already right, and then on every change.
 */
export function useDrive<E extends HTMLElement, T>(
  value: MotionValue<T>,
  write: (el: E, v: T) => void,
): RefObject<E | null> {
  const ref = useRef<E | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    write(el, value.get());
    return value.on("change", (v) => write(el, v));
  }, [value, write]);
  return ref;
}
