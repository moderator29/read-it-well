"use client";

import { useEffect, useRef, useState } from "react";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * A real figure that counts up once, the first time it scrolls into view.
 *
 * THE SERVER PRINTS THE FINAL NUMBER, so the figure is correct with scripts
 * off, in a crawler, in print and under reduced motion. By default only a
 * figure that starts below the fold counts: one already on screen at mount
 * keeps its number rather than flashing to zero and back. `eager` (the
 * summary card's and KPI tile's figure, plan item 26) counts on first view
 * even when that view is the first screen.
 *
 * 600ms on an ease-out curve (plan item 26; it was the 900ms cinematic token
 * for the landing), tabular numerals so the width never jumps while the
 * digits turn. A figure that CHANGES while shown (a new request arrives)
 * never recounts: it crossfades to the new number over 160ms. Pass a BCP 47
 * tag (`intlTag` from `@vallo/i18n`) rather than the dictionary, so this
 * stays a leaf. `prefix` and `suffix` ride outside the digits ("N", "%").
 */
export function CountUp({
  value,
  tag = "en-NG",
  prefix,
  suffix,
  eager = false,
  className,
}: {
  value: number;
  tag?: string;
  prefix?: string;
  suffix?: string;
  eager?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const counted = useRef(false);
  const [swap, setSwap] = useState(0);

  useEffect(() => {
    /* After the first count, a new value is a live change: crossfade. */
    if (counted.current) {
      setShown(value);
      setSwap((n) => n + 1);
      return;
    }
    const el = ref.current;
    if (!el || value <= 0) {
      counted.current = true;
      return;
    }
    if (motionQuiet() || typeof IntersectionObserver === "undefined") {
      counted.current = true;
      return;
    }
    if (!eager && el.getBoundingClientRect().top < window.innerHeight) {
      counted.current = true;
      return;
    }
    setShown(0);
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const DURATION = 600;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION);
          const eased = 1 - (1 - p) ** 3;
          setShown(Math.round(value * eased));
          if (p < 1) raf = requestAnimationFrame(tick);
          else counted.current = true;
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      /* A cleanup mid-count (a new value) lands on the final number. */
      counted.current = true;
    };
  }, [value, eager]);

  const fmt = new Intl.NumberFormat(tag);
  return (
    <span ref={ref} className={`nf-numeric nf-m-count ${className ?? ""}`.trim()}>
      {/* The final figure for assistive tech, whatever the digits are doing. */}
      <span aria-hidden="true" key={swap} className={swap > 0 ? "nf-count-swap" : undefined}>
        {prefix}
        {fmt.format(shown)}
        {suffix}
      </span>
      <span className="sr-only">
        {prefix}
        {fmt.format(value)}
        {suffix}
      </span>
    </span>
  );
}
