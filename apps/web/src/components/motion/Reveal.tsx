"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * The Track M section reveal: rise 16px and fade, 520ms entrance, with the
 * direct children of a `stagger` reveal arriving 60ms apart (six steps at most,
 * app/css/motion-kit.css). The timing table in docs/TRACK_M_MOTION_PLAN.md is
 * the contract.
 *
 * VISIBLE UNTIL JAVASCRIPT SAYS OTHERWISE, which is the inversion
 * `components/site/Reveal.tsx` asks for in its own notes. The server renders
 * no state at all, so a page whose scripts never run, a print, or a capture
 * taken before hydration shows everything. On mount, an element already
 * inside the viewport is left alone (there is no entry left to animate) and
 * only an element below the fold is hidden and handed to the observer, so
 * the hide itself is never on screen.
 *
 * Reduced motion: never hidden, never animated.
 */
export function MotionReveal({
  children,
  as: Tag = "div",
  stagger = false,
  className,
  style,
  id,
  "aria-labelledby": labelledBy,
  "aria-label": label,
}: {
  children: ReactNode;
  as?: "div" | "section" | "ul" | "ol" | "li" | "dl";
  /** Stagger the direct children 60ms apart instead of moving as one. */
  stagger?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("out");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      style={style}
      data-reveal={state === "idle" ? undefined : state}
      className={[stagger ? "nf-m-stagger" : "nf-m-reveal", className ?? ""].join(" ").trim()}
    >
      {children}
    </Comp>
  );
}
