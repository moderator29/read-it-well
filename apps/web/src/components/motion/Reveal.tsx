"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { motionQuiet } from "@/lib/motion/gate";

/**
 * THE ONE REVEAL (UIUX item 25). `components/site/Reveal.tsx` is a
 * re-export of this, so the landing and the app no longer ship two reveal
 * systems with different offsets and delays.
 *
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
/** The latest a reveal may start after its trigger: the sixth stagger step. */
export const REVEAL_DELAY_CAP = 300;

export function MotionReveal({
  children,
  as: Tag = "div",
  stagger = false,
  delay = 0,
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
  /**
   * A sibling's offset in milliseconds, for a list of separate reveals.
   * CAPPED AT THE SIXTH STEP (300ms), the same ceiling the stagger has, so a
   * long list never makes its tenth item wait half a second; the rest arrive
   * with the sixth. This is the prop `components/site/Reveal.tsx` used to
   * take with no cap (`i * 40` on eight category tiles).
   */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  /*
   * The state is written straight onto the element rather than through React
   * state: it is presentation only, React never renders these attributes, so
   * a re-render cannot reset them, and there is no second render per reveal.
   *
   *   data-reveal="out" | "in"   the entrance (below the fold at mount only)
   *   data-seen="true"           this has been on screen at least once; what
   *                              a heading's word-by-word arrival waits for
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Reduced motion, or Calm and Off in the motion setting: never hidden. */
    const reduce = motionQuiet();
    if (reduce || typeof IntersectionObserver === "undefined" || el.getBoundingClientRect().top < window.innerHeight) {
      el.dataset.seen = "true";
      return;
    }
    el.dataset.reveal = "out";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "in";
          el.dataset.seen = "true";
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      /* Never leave a block hidden with nothing watching it: a re-run of this
         effect decides afresh from where the block is now. */
      if (el.dataset.reveal === "out") delete el.dataset.reveal;
    };
  }, []);

  const Comp = Tag as "div";
  const wait = Math.min(Math.max(delay, 0), REVEAL_DELAY_CAP);
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      id={id}
      aria-labelledby={labelledBy}
      aria-label={label}
      style={wait > 0 ? { ...style, animationDelay: `${wait}ms` } : style}
      className={[stagger ? "nf-m-stagger" : "nf-m-reveal", className ?? ""].join(" ").trim()}
    >
      {children}
    </Comp>
  );
}
