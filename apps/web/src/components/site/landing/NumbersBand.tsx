"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/site/Reveal";

/**
 * Numbers band.
 *
 * A strip of platform figures that count up from zero the first time the band
 * scrolls into view, then never again. The server render carries the final
 * values, so crawlers and users without JavaScript read real numbers; on
 * mount the counters rewind to zero and one IntersectionObserver arms a
 * single requestAnimationFrame ramp with an ease out curve. Users who prefer
 * reduced motion keep the final values and nothing moves.
 */

const STATS: { label: string; value: number; suffix: string }[] = [
  { label: "Listings", value: 17, suffix: "+" },
  { label: "Cities", value: 6, suffix: "" },
  { label: "Languages", value: 4, suffix: "" },
  { label: "Support", value: 24, suffix: "/7" },
];

const DURATION_MS = 1400;

export function NumbersBand() {
  const listRef = useRef<HTMLUListElement | null>(null);
  // 1 renders the final values; the mount effect rewinds to 0 before painting
  // moves the band, then the observer drives it back to 1.
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = listRef.current;
    if (!el) return;

    setProgress(0);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          // Ease out cubic, so the last digits settle gently.
          setProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal>
        <ul
          ref={listRef}
          className="nf-card grid grid-cols-2 gap-y-5 px-4 py-6 text-center sm:py-7 lg:grid-cols-4"
        >
          {STATS.map((s) => (
            <li key={s.label}>
              <span className="nf-gradient-text nf-numeric block font-[family-name:var(--nf-font-display)] text-[1.7rem] font-bold leading-none sm:text-[2.1rem]">
                {Math.round(s.value * progress)}
                {s.suffix}
              </span>
              <span className="mt-1.5 block text-[0.72rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
