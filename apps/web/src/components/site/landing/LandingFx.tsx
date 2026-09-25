"use client";

import { useEffect } from "react";

/**
 * The landing's global details that need a pointer or a scroll position
 * (Track M, second pass). One island for the whole page, rendering nothing.
 *
 *   Magnetic calls to action. On a desktop pointer, a primary button marked
 *   `.nf-magnetic` leans towards the cursor, never more than 6px, and
 *   settles back when the cursor leaves. `translate`, so it composes with the
 *   button's own press scale.
 *
 *   The hero card's tilt. The floating listing card turns a few degrees
 *   towards the cursor while it is over the hero.
 *
 *   A fallback for scroll timelines. Where `animation-timeline: scroll()` is
 *   missing, the scroll-progress hairline and the hero parallax read
 *   `--nf-page-p` and `--nf-hero-p`, which this writes once per frame.
 *   Where the browser has scroll timelines it does nothing on scroll at all.
 *
 * None of it attaches on touch, under reduced motion, or with data saver on.
 */
const MAGNET_MAX = 6;
const CARD_TILT = 5;

export function LandingFx() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lite = root.dataset.saveData === "on" || root.dataset.motionLite === "on";
    if (reduce || lite) return;
    const cleanups: (() => void)[] = [];

    /* ---------------------------------------------- scroll fallback */
    const timelines = typeof CSS !== "undefined" && CSS.supports?.("animation-timeline: scroll()");
    if (!timelines) {
      let frame = 0;
      const hero = document.querySelector<HTMLElement>(".nf-landing-hero");
      const read = () => {
        frame = 0;
        const max = Math.max(1, root.scrollHeight - window.innerHeight);
        root.style.setProperty("--nf-page-p", (window.scrollY / max).toFixed(4));
        if (hero) hero.style.setProperty("--nf-hero-p", Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight)).toFixed(4));
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(read);
      };
      read();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        cancelAnimationFrame(frame);
      });
    }

    /* -------------------------------------- pointer: magnets and tilt */
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      let frame = 0;
      let last: PointerEvent | null = null;
      const hero = document.querySelector<HTMLElement>(".nf-landing-hero");
      const card = hero?.querySelector<HTMLElement>(".nf-landing-float-wrap") ?? null;
      const paint = () => {
        frame = 0;
        const e = last;
        if (!e) return;
        const target = (e.target as Element | null)?.closest?.(".nf-magnetic");
        for (const el of document.querySelectorAll<HTMLElement>(".nf-magnetic[data-pulled]")) {
          if (el !== target) {
            el.style.setProperty("--mag-x", "0px");
            el.style.setProperty("--mag-y", "0px");
            delete el.dataset.pulled;
          }
        }
        if (target instanceof HTMLElement) {
          const box = target.getBoundingClientRect();
          const dx = ((e.clientX - (box.left + box.width / 2)) / (box.width / 2)) * MAGNET_MAX;
          const dy = ((e.clientY - (box.top + box.height / 2)) / (box.height / 2)) * MAGNET_MAX;
          target.style.setProperty("--mag-x", `${Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, dx)).toFixed(1)}px`);
          target.style.setProperty("--mag-y", `${Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, dy)).toFixed(1)}px`);
          target.dataset.pulled = "true";
        }
        if (hero && card) {
          const box = hero.getBoundingClientRect();
          const inside = e.clientY >= box.top && e.clientY <= box.bottom;
          const px = inside ? (e.clientX - box.left) / box.width - 0.5 : 0;
          const py = inside ? (e.clientY - box.top) / box.height - 0.5 : 0;
          card.style.setProperty("--card-rx", `${(-py * CARD_TILT).toFixed(2)}deg`);
          card.style.setProperty("--card-ry", `${(px * CARD_TILT).toFixed(2)}deg`);
        }
      };
      const onMove = (e: PointerEvent) => {
        last = e;
        if (!frame) frame = requestAnimationFrame(paint);
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(frame);
      });
    }

    return () => {
      for (const clean of cleanups) clean();
    };
  }, []);

  return null;
}
