"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll reveal.
 *
 * Wraps a block and fades it up the first time it enters the viewport, so the
 * page assembles itself as you scroll rather than arriving all at once. Uses one
 * IntersectionObserver per block, disconnects after firing, and respects reduced
 * motion by rendering visible immediately. `delay` staggers siblings.
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

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
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
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`nf-reveal ${className ?? ""}`}
    >
      {children}
    </Comp>
  );
}
