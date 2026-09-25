"use client";

import { Fragment, useEffect, useRef } from "react";
import { LogoMark } from "@/design-system/brand/Logo";
import { motionQuiet } from "@/lib/motion/gate";
import { MOTION_EVENT } from "@/lib/motion/motion-pref";
import { onScrollFrame, travel } from "@/lib/motion/scroll-loop";

/**
 * KINETIC TYPE (Track M, 25 September 2026).
 *
 * Two rows of very large words that slide in opposite directions as the page
 * scrolls past them, the scroll itself being the motor: stop scrolling and
 * they stop. Solid words alternate with outlined ones and the Vallo mark sits
 * between them, so the band reads as a title sequence rather than a list.
 *
 * The words are the product's own category names from the dictionary. The
 * band has one accessible label saying what they are; the moving rows are
 * `aria-hidden` because a screen reader should hear the list once, not twice.
 *
 * Under Calm, Off or reduced motion the rows sit still, offset as a pair.
 */
export function KineticType({ words, label }: { words: string[]; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop: (() => void) | null = null;
    const decide = () => {
      stop?.();
      stop = null;
      if (motionQuiet()) {
        rowA.current?.style.removeProperty("transform");
        rowB.current?.style.removeProperty("transform");
        return;
      }
      stop = onScrollFrame(({ vh, vw }) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -vh || rect.top > vh * 2) return;
        const shift = (travel(rect, vh) - 0.5) * vw * 0.42;
        return () => {
          if (rowA.current) rowA.current.style.transform = `translate3d(${(-shift).toFixed(1)}px, 0, 0)`;
          if (rowB.current) rowB.current.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
        };
      });
    };
    decide();
    window.addEventListener(MOTION_EVENT, decide);
    return () => {
      stop?.();
      window.removeEventListener(MOTION_EVENT, decide);
    };
  }, []);

  const row = (offset: number) =>
    [...words, ...words, ...words].map((word, i) => (
      <Fragment key={`${word}-${i}`}>
        <span className={(i + offset) % 2 === 0 ? "nf-kinetic__word" : "nf-kinetic__word nf-kinetic__word--outline"}>
          {word}
        </span>
        <span className="nf-kinetic__mark">
          <LogoMark size={48} />
        </span>
      </Fragment>
    ));

  return (
    <div ref={host} className="nf-kinetic" role="img" aria-label={`${label}: ${words.join(", ")}`}>
      <div ref={rowA} className="nf-kinetic__row" aria-hidden="true">
        {row(0)}
      </div>
      <div ref={rowB} className="nf-kinetic__row nf-kinetic__row--b" aria-hidden="true">
        {row(1)}
      </div>
    </div>
  );
}
