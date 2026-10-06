"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { markSeen, seenOnce } from "@/lib/ui/seen-once";
import "./agreements.css";

/** The CSS fill ends by here (agreements.css: last connector 360ms + 220ms). */
export const TRACK_FILL_MS = 600;

/**
 * M2: "AGREEMENT APPROVED: TIMELINE FILLS TO THE FINAL STEP, POP ON THE LAST
 * NODE" (MOTION_SYSTEM section 2, payoff moments).
 *
 * It wraps the page's own `StatusTrack` (components/app/status), which draws
 * and decides nothing, and it forks nothing of it: the fill is CSS on the
 * track's own connectors (agreements.css), and this component only decides
 * whether the payoff pop plays.
 *
 * THE FILL plays on every arrival, in CSS, before any script: the reached
 * connectors draw from the first step to the step the record stands on, and
 * each reached node comes up to full ink as the line arrives. It answers how
 * far along the agreement is. Deliberate rhythm, because this is money's
 * paperwork: about 600ms in all.
 *
 * THE POP plays only when the approval truly happened (`popAt` is passed by
 * the page only for an approved agreement whose approval step is done and
 * dated from the record), only once per device for this agreement (the
 * `seen-once` store the approval sheet already uses, under its own key), and
 * only once the fill has reached the node. If a dialog is open over the page
 * at that moment (the approval sheet opens on the same first visit), the pop
 * waits for it to close, so the one payoff is seen rather than spent behind
 * a scrim. Under reduced motion, Calm or Off nothing plays and the final
 * state is simply drawn.
 *
 * No haptic: the moment arrives with the page rather than from a touch, the
 * same reason the approval sheet plays none (craft doctrine 6).
 */
export function AgreementTrackMotion({
  children,
  popAt,
  seenKey,
}: {
  children: ReactNode;
  /** The 1-based step whose node pops, or null for no payoff. */
  popAt: number | null;
  seenKey: string;
}) {
  const { quiet } = useMotionGate();
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (popAt === null || quiet || seenOnce(seenKey)) return;
    let observer: MutationObserver | null = null;
    const covered = () => document.querySelector('[aria-modal="true"]:not([data-closing])') !== null;
    const play = () => {
      markSeen(seenKey);
      setPop(true);
    };
    const timer = window.setTimeout(() => {
      if (!covered()) {
        play();
        return;
      }
      observer = new MutationObserver(() => {
        if (covered()) return;
        observer?.disconnect();
        observer = null;
        play();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal", "data-closing"] });
    }, TRACK_FILL_MS);
    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [popAt, quiet, seenKey]);

  return (
    <div className="nf-agr-track" data-pop-at={popAt ?? undefined} data-pop={pop ? "play" : undefined}>
      {children}
    </div>
  );
}
