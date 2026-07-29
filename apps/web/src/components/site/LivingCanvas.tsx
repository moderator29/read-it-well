"use client";

import { useEffect } from "react";

/**
 * The canvas director. Renders nothing; wires three ambient behaviours:
 *
 * 1. Pointer bloom: writes --nf-px/--nf-py onto the ambient layer so its
 *    fourth span drifts after the cursor.
 * 2. Cursor-lit glass: writes --mx/--my onto whichever interactive card the
 *    pointer is over, feeding the card's light-spot gradient.
 * 3. Daypart grading: stamps data-daypart on the root element from Lagos
 *    time, so the aurora runs hotter at dusk and settles at deep night.
 *
 * Everything is one delegated listener and one interval; no per-card state.
 * Reduced-motion users keep the static canvas: the CSS side gates the visuals.
 */
export function LivingCanvas() {
  useEffect(() => {
    const ambient = document.querySelector<HTMLElement>(".nf-ambient");
    let raf = 0;
    let px = 0;
    let py = 0;
    let card: HTMLElement | null = null;
    let cx = 0;
    let cy = 0;

    const apply = () => {
      raf = 0;
      if (ambient) {
        ambient.style.setProperty("--nf-px", String(px));
        ambient.style.setProperty("--nf-py", String(py));
      }
      if (card) {
        card.style.setProperty("--mx", `${cx}px`);
        card.style.setProperty("--my", `${cy}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth) * 100;
      py = (e.clientY / window.innerHeight) * 100;
      const target = (e.target as Element | null)?.closest<HTMLElement>(
        ".nf-card--interactive",
      );
      card = target ?? null;
      if (card) {
        const box = card.getBoundingClientRect();
        cx = e.clientX - box.left;
        cy = e.clientY - box.top;
      }
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const grade = () => {
      const hour = Number(
        new Intl.DateTimeFormat("en-GB", {
          hour: "numeric",
          hour12: false,
          timeZone: "Africa/Lagos",
        }).format(new Date()),
      );
      const daypart =
        hour >= 5 && hour < 8
          ? "dawn"
          : hour >= 8 && hour < 17
            ? "day"
            : hour >= 17 && hour < 21
              ? "dusk"
              : "night";
      document.documentElement.dataset.daypart = daypart;
    };

    grade();
    const tick = window.setInterval(grade, 10 * 60 * 1000);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.clearInterval(tick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
