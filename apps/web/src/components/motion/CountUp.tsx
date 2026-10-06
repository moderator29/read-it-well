"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatMoney, formatMoneyGlance, type Locale } from "@vallo/i18n/core";
import { motionQuiet } from "@/lib/motion/gate";
import { EASE, FIGURE_ARRIVAL_MS } from "@/lib/motion/ease";
import { Odometer } from "@/components/ui/Odometer";

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
 * 620ms on the `glide` curve (north star motion 4, Session 3; it was 600ms
 * on an unnamed cubic, and the landing's 900ms cinematic token before that),
 * tabular numerals so the width never jumps while the digits turn. A figure
 * that CHANGES while shown (a new request arrives) never recounts: the digits
 * that changed roll to their new values (`Odometer`, motion 5). Pass a BCP 47
 * tag (`intlTag` from `@vallo/i18n`) rather than the dictionary, so this
 * stays a leaf. `prefix` and `suffix` ride outside the digits ("N", "%").
 */
/**
 * The count itself, shared by `CountUp` (a plain figure) and `CountUpMoney`
 * (a money figure): 0 to `value` once per mount, 620ms `glide`, on first view
 * (or at once with `eager`), the final value with motion off. A later change
 * of `value` does not recount and a re-render with the same value does
 * nothing: the new value lands, `swap` ticks, and the caller rolls the
 * changed digits on the odometer.
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
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / FIGURE_ARRIVAL_MS);
          const eased = EASE.glide(p);
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
  const { ref, shown, counting } = useCountUp(value, eager);
  const fmt = new Intl.NumberFormat(tag);
  const text = `${prefix ?? ""}${fmt.format(shown)}${suffix ?? ""}`;
  return (
    <span ref={ref} className={`nf-numeric nf-m-count ${className ?? ""}`.trim()}>
      {counting ? (
        <>
          {/* The final figure for assistive tech, whatever the digits are doing. */}
          <span aria-hidden="true">{text}</span>
          <span className="sr-only">
            {prefix}
            {fmt.format(value)}
            {suffix}
          </span>
        </>
      ) : (
        /* At rest the figure is an odometer: it mounts on the final value
           (no roll), and only a later change of `value` turns its wheels. */
        <Odometer value={text} />
      )}
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
  const { ref, shown, counting, swap } = useCountUp(whole, eager);
  /*
   * A CONFIRMED CHANGE ROLLS, THEN THE PRINTED FIGURE RETURNS. When the
   * amount changes after the arrival count (the caller passes a new
   * `minorUnits` only once the server has confirmed it), the changed digits
   * roll on the odometer in whole naira, and the caller's own `Amount` with
   * its kobo styling takes over again once the wheels have stopped.
   */
  const [rolling, setRolling] = useState<{ from: string; turn: number } | null>(null);
  const [seenSwap, setSeenSwap] = useState(swap);
  const [last, setLast] = useState(minorUnits);
  if (swap !== seenSwap) {
    setSeenSwap(swap);
    setLast(minorUnits);
    setRolling({ from: formatMoney(last, locale, currency), turn: swap });
  }
  useEffect(() => {
    if (rolling === null) return;
    /* The longest roll: 380ms plus the stagger across a long figure. */
    const timer = window.setTimeout(() => setRolling(null), 380 + 20 * 12);
    return () => window.clearTimeout(timer);
  }, [rolling]);
  if (rolling !== null) {
    return (
      <span ref={ref} className="nf-m-count">
        <Odometer
          key={rolling.turn}
          from={rolling.from}
          value={formatMoney(minorUnits, locale, currency)}
          className={frameClassName}
        />
      </span>
    );
  }
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
