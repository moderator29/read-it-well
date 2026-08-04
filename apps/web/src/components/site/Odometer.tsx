"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, DEFAULT_LOCALE, type Locale } from "@naijafinds/i18n";

/**
 * Odometer number.
 *
 * Each digit lives in a strip of 0 to 9 that rolls to its final position, the
 * way a mechanical counter settles. Digits land left to right on a stagger,
 * so a figure assembles rather than appearing. This reads as considerably
 * more premium than a linear count-up for the same amount of code, and it is
 * pure transform, so it runs on the compositor.
 *
 * Rolls once when the number scrolls into view. Reduced motion renders the
 * final figure immediately.
 */
export function Odometer({
  value,
  suffix,
  locale = DEFAULT_LOCALE,
  className,
}: {
  value: number;
  suffix?: string;
  /** The app's locale, never the browser's. See the grouping note below. */
  locale?: Locale;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [rolled, setRolled] = useState(false);
  // Thousands separators matter here: a wallet balance in the hundreds of
  // thousands read as one unbroken run of digits is a regression from plain
  // formatted text, so the odometer rolls the grouped string, not the bare
  // number, and treats the separator as a static character between strips.
  //
  // The grouping is the APP's, not the visitor's device. `toLocaleString()`
  // with no argument reads the browser's locale, so a wallet balance rolled
  // "258.450" on a German phone while every other figure on the same page
  // used commas. This carries the wallet balance and the landing band.
  const formatted = formatNumber(Math.max(0, Math.round(value)), locale);
  const chars = formatted.split("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRolled(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRolled(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={`nf-odometer nf-numeric ${className ?? ""}`}>
      <span className="sr-only">
        {formatted}
        {suffix}
      </span>
      <span aria-hidden="true" className="inline-flex">
        {(() => {
          let digitPosition = -1;
          return chars.map((ch, i) => {
            if (ch < "0" || ch > "9") {
              return (
                <span key={`${i}-sep`} className="nf-odometer__sep">
                  {ch}
                </span>
              );
            }
            digitPosition += 1;
            return (
              <span key={`${i}-${ch}`} className="nf-odometer__slot">
                <span
                  className="nf-odometer__strip"
                  style={{
                    transform: `translateY(-${(rolled ? Number(ch) : 0) * 10}%)`,
                    transitionDelay: `${digitPosition * 90}ms`,
                  }}
                >
                  {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                    <span key={n} className="nf-odometer__digit">
                      {n}
                    </span>
                  ))}
                </span>
              </span>
            );
          });
        })()}
        {suffix && <span>{suffix}</span>}
      </span>
    </span>
  );
}
