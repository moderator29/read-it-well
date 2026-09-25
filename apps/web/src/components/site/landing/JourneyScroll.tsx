"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The journey's one piece of JavaScript: which chapter is at the middle of
 * the screen (Track M, second pass).
 *
 * An IntersectionObserver on a thin band across the centre of the viewport
 * watches the chapters (`[data-journey-step]`) and writes the current one to
 * `data-step` on this wrapper. Everything else is CSS keyed on that
 * attribute: the phone's screens cross-fade, the chapter lights, and the
 * progress rail fills a quarter at a time. Where the browser has scroll
 * timelines the rail is driven by scroll directly (landing-rooms.css), and
 * this still decides the screen. Written onto the element, not React state,
 * so scrolling never re-renders the section.
 *
 * With no observer the attribute stays at the first step and the stacked
 * layout below 64rem, which does not depend on it, is what a reader gets.
 */
export function JourneyScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const chapters = [...root.querySelectorAll<HTMLElement>("[data-journey-step]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const step = (e.target as HTMLElement).dataset.journeyStep;
          if (step !== undefined) root.dataset.step = step;
        }
      },
      { threshold: 0, rootMargin: "-45% 0px -45% 0px" },
    );
    for (const chapter of chapters) io.observe(chapter);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-step="0">
      {children}
    </div>
  );
}
