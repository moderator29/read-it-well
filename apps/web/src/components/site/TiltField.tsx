"use client";

import { useEffect } from "react";

/**
 * Tile parallax director.
 *
 * Renders nothing. One delegated pointer listener writes two custom
 * properties onto whichever object tile the pointer is over, and the tile's
 * own CSS turns them into a small 3D tilt plus a shifted corner light. The
 * object leans toward the cursor the way a real lit chip would, which is the
 * cheapest premium detail available: no per-tile state, no React re-render,
 * one rAF per frame at most.
 *
 * Fine pointers only, and the CSS side is disabled under reduced motion, so
 * touch users pay nothing for it.
 */
export function TiltField() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let tile: HTMLElement | null = null;
    let last: HTMLElement | null = null;
    let rx = 0;
    let ry = 0;

    const apply = () => {
      raf = 0;
      if (last && last !== tile) {
        last.style.removeProperty("--tilt-x");
        last.style.removeProperty("--tilt-y");
      }
      if (tile) {
        tile.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
        tile.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
      }
      last = tile;
    };

    const onMove = (e: PointerEvent) => {
      const found = (e.target as Element | null)?.closest<HTMLElement>(".nf-icon-tile");
      tile = found ?? null;
      if (tile) {
        const b = tile.getBoundingClientRect();
        // Normalised to -1..1 from the tile centre, then capped at a gentle
        // angle: past about 8 degrees a small chip reads as broken, not lit.
        const nx = (e.clientX - b.left) / b.width - 0.5;
        const ny = (e.clientY - b.top) / b.height - 0.5;
        ry = Math.max(-8, Math.min(8, nx * 16));
        rx = Math.max(-8, Math.min(8, -ny * 16));
      }
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
      last?.style.removeProperty("--tilt-x");
      last?.style.removeProperty("--tilt-y");
    };
  }, []);

  return null;
}
