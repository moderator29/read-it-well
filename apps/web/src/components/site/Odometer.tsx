"use client";

import { useEffect, useRef, useState } from "react";

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
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [rolled, setRolled] = useState(false);
  const digits = String(Math.max(0, Math.round(value))).split("");

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
        {value.toLocaleString()}
        {suffix}
      </span>
      <span aria-hidden="true" className="inline-flex">
        {digits.map((d, i) => (
          <span key={`${i}-${d}`} className="nf-odometer__slot">
            <span
              className="nf-odometer__strip"
              style={{
                transform: `translateY(-${(rolled ? Number(d) : 0) * 10}%)`,
                transitionDelay: `${i * 90}ms`,
              }}
            >
              {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
                <span key={n} className="nf-odometer__digit">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
        {suffix && <span>{suffix}</span>}
      </span>
    </span>
  );
}
