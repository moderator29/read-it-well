"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatMoney, formatMoneyGlance, type Locale } from "@vallo/i18n/core";
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
/**
 * The count itself, shared by `CountUp` (a plain figure) and `CountUpMoney`
 * (a money figure): 0 to `value` once, 600ms ease-out, on first view (or at
 * once with `eager`), the final value with motion off. A later change of
 * `value` does not recount: it lands, and `swap` ticks for a crossfade.
 */
export function useCountUp(value: number, eager: boolean) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState(value);
  const counted = useRef(false);
  const [swap, setSwap] = useState(0);
  const [counting, setCounting] = useState(false);

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
    setCounting(true);
    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        started = true;
        const start = performance.now();
        const DURATION = 600;
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / DURATION);
          const eased = 1 - (1 - p) ** 3;
          setShown(p < 1 ? Math.round(value * eased) : value);
          if (p < 1) raf = requestAnimationFrame(tick);
          else {
            counted.current = true;
            setCounting(false);
          }
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      /* A cleanup mid-count (a new value) lands on the final number. One
         before the count began (React's development double-run of effects,
         or a value that changed before first view) leaves the count to the
         next run; marking it counted here is why nothing ever counted in
         development. */
      if (started) counted.current = true;
      setShown(value);
      setCounting(false);
    };
  }, [value, eager]);

  return { ref, shown, swap, counting };
}

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
  const { ref, shown, swap } = useCountUp(value, eager);
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

/**
 * A MONEY FIGURE THAT COUNTS UP (the founder's count-up ruling, 30 September
 * 2026: money summaries are hero figures too).
 *
 * `children` is the figure as the page prints it at rest, usually `Amount`
 * with its kobo styling; the server renders exactly that, so the right
 * number is there with scripts off. While counting, the digits run in whole
 * naira through `formatMoney` (compact when `glance` and large), then the
 * children take over on the last frame. A screen reader hears the final
 * figure only.
 */
export function CountUpMoney({
  minorUnits,
  locale,
  currency = "NGN",
  glance = false,
  eager = false,
  frameClassName,
  children,
}: {
  minorUnits: number;
  locale: Locale;
  currency?: string;
  glance?: boolean;
  eager?: boolean;
  /** The resting figure's size and weight, for the running digits. */
  frameClassName?: string;
  children: ReactNode;
}) {
  const whole = Math.max(0, Math.round(minorUnits / 100));
  const { ref, shown, counting } = useCountUp(whole, eager);
  return (
    <span ref={ref} className="nf-m-count">
      {counting ? (
        <>
          <span aria-hidden="true" className={`nf-numeric ${frameClassName ?? ""}`.trim()}>
            {glance ? formatMoneyGlance(shown * 100, locale, currency) : formatMoney(shown * 100, locale, currency)}
          </span>
          <span className="sr-only">{formatMoney(minorUnits, locale, currency)}</span>
        </>
      ) : (
        children
      )}
    </span>
  );
}
