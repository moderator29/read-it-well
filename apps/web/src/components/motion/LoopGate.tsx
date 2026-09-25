"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { usePlayWhenVisible } from "./useInView";

/**
 * A box whose CSS loops run only while it is on screen in a visible tab
 * (Track M). It writes `data-playing="true"` or `"false"`; the loops inside
 * key `animation-play-state` off it (`.nf-loop` in motion-kit.css). The
 * server renders `"false"`, so nothing loops before the page is interactive
 * and nothing ever loops off screen. Reduced motion and data saver stop the
 * loops in CSS regardless.
 */
export function LoopGate({
  children,
  className,
  style,
  as: Tag = "div",
  "aria-hidden": ariaHidden,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "ul";
  "aria-hidden"?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const playing = usePlayWhenVisible(ref);
  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      style={style}
      aria-hidden={ariaHidden}
      data-playing={playing ? "true" : "false"}
    >
      {children}
    </Comp>
  );
}
