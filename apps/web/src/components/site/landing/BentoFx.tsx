"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motionQuiet } from "@/lib/motion/gate";
import { onMotionGate } from "@/components/motion/useMotionGate";

/**
 * The bento's spotlight and tilt (Track M, second pass).
 *
 * On a fine pointer that hovers, a pointermove over a card writes the cursor
 * position into `--spot-x` / `--spot-y` (the radial light in
 * landing-rooms.css) and a tilt of at most four degrees into `--tilt-x` /
 * `--tilt-y`, once per frame. Leaving the card lets both relax back on the
 * stylesheet's transition. One listener on the grid, delegated; no state, no
 * re-render. Touch, reduced motion and data saver attach nothing.
 */
const MAX_TILT = 4;

export function BentoFx({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    return onMotionGate(() => {
      const fine = window.matchMedia(
        "(hover: hover) and (pointer: fine)"
      ).matches;
      const lite = document.documentElement.dataset.saveData === "on";
      if (!fine || motionQuiet() || lite) return;
      let frame = 0;
      let last: { card: HTMLElement; x: number; y: number } | null = null;
      const paint = () => {
        frame = 0;
        if (!last) return;
        const { card, x, y } = last;
        const box = card.getBoundingClientRect();
        const px = (x - box.left) / box.width;
        const py = (y - box.top) / box.height;
        card.style.setProperty("--spot-x", `${(px * 100).toFixed(1)}%`);
        card.style.setProperty("--spot-y", `${(py * 100).toFixed(1)}%`);
        card.style.setProperty(
          "--tilt-x",
          `${((0.5 - py) * 2 * MAX_TILT).toFixed(2)}deg`
        );
        card.style.setProperty(
          "--tilt-y",
          `${((px - 0.5) * 2 * MAX_TILT).toFixed(2)}deg`
        );
      };
      const move = (event: PointerEvent) => {
        const card = (event.target as Element | null)?.closest?.(
          ".nf-bento__card"
        );
        if (!(card instanceof HTMLElement)) return;
        last = { card, x: event.clientX, y: event.clientY };
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const leave = (event: PointerEvent) => {
        const card = (event.target as Element | null)?.closest?.(
          ".nf-bento__card"
        );
        if (!(card instanceof HTMLElement)) return;
        /* `pointerout` bubbles from every child; only leaving the card counts. */
        if (
          event.relatedTarget instanceof Node &&
          card.contains(event.relatedTarget)
        )
          return;
        if (last?.card === card) last = null;
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      };
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerout", leave);
      return () => {
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerout", leave);
        cancelAnimationFrame(frame);
        for (const card of root.querySelectorAll<HTMLElement>(
          ".nf-bento__card"
        )) {
          card.style.removeProperty("--tilt-x");
          card.style.removeProperty("--tilt-y");
        }
      };
    });
  }, []);

  return (
    <div ref={ref} className="nf-bento-fx">
      {children}
    </div>
  );
}
