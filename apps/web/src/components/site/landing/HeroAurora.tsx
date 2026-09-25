"use client";

import { useRef } from "react";
import { usePlayWhenVisible } from "@/components/motion/useInView";

/**
 * The hero's moving light (Track M): three soft fields in the brand hues
 * drifting on a 28 second linear loop, transform only.
 *
 * It is one of the two loops the motion plan allows on the whole site, and
 * it runs only while the hero is on screen AND the tab is being looked at:
 * `data-playing` flips `animation-play-state` (landing-rooms.css). Reduced
 * motion and data saver get a still gradient; the rules are in the same file.
 */
export function HeroAurora() {
  const ref = useRef<HTMLDivElement | null>(null);
  const playing = usePlayWhenVisible(ref);
  return (
    <div ref={ref} className="nf-hero-aurora" data-playing={playing ? "true" : "false"} aria-hidden="true">
      <span className="nf-hero-aurora-a" />
      <span className="nf-hero-aurora-b" />
      <span className="nf-hero-aurora-c" />
    </div>
  );
}
