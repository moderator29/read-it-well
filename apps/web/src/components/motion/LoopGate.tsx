"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { usePlayWhenVisible } from "./useInView";
import { useMotionGate } from "./useMotionGate";

/**
 * A box whose CSS loops run only while it is on screen in a visible tab
 * (Track M). It writes `data-playing="true"` or `"false"`; the loops inside
 * key `animation-play-state` off it (`.nf-loop` in motion-kit.css). The
 * server renders `"false"`, so nothing loops before the page is interactive
 * and nothing ever loops off screen. The motion setting's Calm and Off stop
 * them here; reduced motion and data saver stop them in CSS as well.
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
  const visible = usePlayWhenVisible(ref);
  /* Calm and Off (Settings > Appearance > Motion) stop every loop too. */
  const { quiet } = useMotionGate();
  const playing = visible && !quiet;
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
