"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll reveal.
 *
 * Wraps a block and fades it up the first time it enters the viewport, so the
 * page assembles itself as you scroll rather than arriving all at once. Uses one
 * IntersectionObserver per block, disconnects after firing, and respects reduced
 * motion by rendering visible immediately. `delay` staggers siblings.
 *
 * ALREADY ON SCREEN MEANS ALREADY REVEALED. A block sitting in the viewport at
 * first paint gets `data-instant`, which switches the scroll-driven animation
 * off for it entirely. Without that, the CSS view() timeline held the first
 * result card on /search at 56% opacity behind a 1.3px blur until the visitor
 * scrolled, because an animation outranks this component's revealed state in the
 * cascade and the card began life part way through its own entry range. Content
 * you have to scroll to still gets the full choreography; content you can
 * already see is simply legible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "ul";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      setInstant(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    // Anything whose top edge is already inside the viewport on mount is
    // above the fold. There is no entry transit left for it to animate
    // through, so it is shown outright rather than left mid flight.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight) {
      setShown(true);
      setInstant(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      data-shown={shown}
      data-instant={instant ? "true" : undefined}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`nf-reveal ${className ?? ""}`}
    >
      {children}
    </Comp>
  );
}
