"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { motionQuiet } from "@/lib/motion/gate";
import { EASE_LAND } from "@/components/ui/ported-motion";

/**
 * A REPLY OR A COMMENT OPENING INTO THE CONVERSATION (D72 motion: "comments
 * expanding").
 *
 * With `appear`, the row opens from nothing to its own height on `land`, so
 * everything under it slides down to make room, and its contents fade up 8px
 * a beat behind. Without it, the row is simply there: the parent passes
 * `appear` only for what arrives after the conversation opened (a reply you
 * just sent, the box you just asked to answer in), never for what was on the
 * page when it loaded.
 *
 * framer-motion's `animate()` on the element, not the `motion` components
 * (D39, D49.1: no feature bundle is mounted). Height is the one
 * non-transform property here and it is the point: making room is the
 * motion. The clip lasts only for the opening, so the card's lit edge and
 * glow come back the moment it is open. Reduced motion, Calm and Off: there,
 * with nothing in between.
 */
export function Expand({
  appear,
  children,
  className,
  style,
  as = "div",
}: {
  appear: boolean;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  /* Decided on mount: a row that was there stays still for its life. */
  const [opening] = useState(appear);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!opening || !el || motionQuiet()) return;
    const height = el.getBoundingClientRect().height;
    el.style.overflow = "hidden";
    el.style.height = "0px";
    el.style.opacity = "0";
    const open = animate(el, { height: [0, height] }, { duration: 0.36, ease: EASE_LAND });
    const show = animate(el, { opacity: [0, 1], y: [8, 0] }, { duration: 0.3, ease: EASE_LAND, delay: 0.06 });
    open.then(() => {
      el.style.height = "";
      el.style.overflow = "";
    });
    return () => {
      open.stop();
      show.stop();
      el.style.height = "";
      el.style.overflow = "";
      el.style.opacity = "";
      el.style.transform = "";
    };
  }, [opening]);

  const Tag = as;
  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        ref.current = node;
      }}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
