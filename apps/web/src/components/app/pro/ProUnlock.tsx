"use client";

import "./pro.css";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { feedback } from "@/lib/ui/feedback";

/**
 * THE PRO UNLOCK MOMENT (MOTION_SYSTEM section 5, "Pro and premium areas", and
 * the "Pro unlock" row of section 2): the surface lifts 8px as its veil
 * dissolves, `land` 380ms, then one pop (1.0 to 1.04 to 1.0 over 180ms) and
 * one haptic. Unlock is one of the five payoffs allowed to pop.
 *
 * It plays ONLY when Pro view turns on while the member is looking, never on
 * a page load that is already in Pro view, because a surface that celebrates
 * itself on every visit is decoration, not information. The first value of
 * `on` is remembered and only a change from off to on plays it.
 *
 * Never shown to a member without a plan, because the caller only draws Pro
 * content for an entitled member (`ProSwitch`), and there is nothing locked to
 * animate invitingly for anybody else (section 5: "never animate a locked
 * state invitingly").
 *
 * Quiet readers (reduced motion, Calm, Off) get the surface at once, with no
 * lift, no pop and no haptic. Transform and opacity only.
 */
export function ProUnlock({ on, children }: { on: boolean; children: ReactNode }) {
  const { quiet } = useMotionGate();
  /* The previous value, kept in state so the change is seen DURING the render
     that brings the surface in: the surface's first frame is already the
     lifted, veiled one, never a settled frame followed by a jump. */
  const [prevOn, setPrevOn] = useState(on);
  const [play, setPlay] = useState(false);
  if (on !== prevOn) {
    setPrevOn(on);
    setPlay(on && !quiet);
  }

  useEffect(() => {
    if (!play) return;
    /* The haptic lands with the pop, after the lift. */
    const timer = window.setTimeout(() => feedback("success"), 380);
    return () => window.clearTimeout(timer);
  }, [play]);

  if (!on) return null;
  return (
    <div className="nf-pro-unlock" data-play={play ? "" : undefined}>
      <div className="nf-pro-unlock__pop">{children}</div>
    </div>
  );
}
