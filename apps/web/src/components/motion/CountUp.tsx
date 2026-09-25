"use client";

import { useEffect, useRef, useState } from "react";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * A real figure that counts up once, the first time it scrolls into view.
 *
 * THE SERVER PRINTS THE FINAL NUMBER, so the figure is correct with scripts
 * off, in a crawler, in print and under reduced motion. Only a figure that
 * starts below the fold counts: one already on screen at mount keeps its
 * number rather than flashing to zero and back.
 *
 * 900ms (the cinematic token) on an ease-out curve, tabular numerals so the
 * width never jumps while the digits turn. Pass a BCP 47 tag (`intlTag` from
 * `@vallo/i18n`) rather than the dictionary, so this stays a leaf.
 */
export function CountUp({
  value,
  tag = "en-NG",
  className,
}: {
  value: number;
  tag?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (motionQuiet()) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const DURATION = 900;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION);
          const eased = 1 - (1 - p) ** 3;
          setShown(Math.round(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <span ref={ref} className={`nf-numeric nf-m-count ${className ?? ""}`.trim()}>
      {/* The final figure for assistive tech, whatever the digits are doing. */}
      <span aria-hidden="true">{new Intl.NumberFormat(tag).format(shown)}</span>
      <span className="sr-only">{new Intl.NumberFormat(tag).format(value)}</span>
    </span>
  );
}
