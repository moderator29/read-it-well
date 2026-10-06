"use client";

import "./streaks.css";
import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { feedback } from "@/lib/ui/feedback";

/**
 * THE EARNED MOMENT (north star 15.1 and motion 22, reference 7043 and the
 * earlier-round 41; MOTION_SYSTEM "Badge or streak earned").
 *
 * It is earned, so the celebration is honest, and it is still quiet: a soft
 * sunburst behind a matte clay medal (the accepted `rosette`, Tier B), the
 * medal scaling in on `drift` 620ms, then the one payoff pop (1.0 to 1.04 to
 * 1.0, 180ms) with the one heavy haptic, then the achievement named in display
 * type, one line saying what it means, and Share and Back rising after it.
 * Tapping the medal replays the moment once; nothing replays on its own and
 * nothing loops. No confetti, no flame, no count of strangers.
 *
 * WHAT IT IS FOR. The share card for an on-time rent record is the strongest
 * organic loop the platform has, because its reader is usually a prospective
 * landlord. So Share is the primary here and Back the quiet second.
 *
 * Shown only for a milestone Session 2 actually recorded (W7-R6): the caller
 * passes the words, and this component has no default achievement.
 *
 * Quiet readers (reduced motion, Calm, Off) see the settled moment with a
 * 160ms fade and no haptic. Transform and opacity only.
 */
export function EarnedMoment({
  title,
  meaning,
  share,
  back,
  replayLabel,
}: {
  /** The achievement, named: "Twelve rent payments on time". */
  title: string;
  /** One line saying what it means. */
  meaning: string;
  /** The primary action: a Share button the caller wires to the share card. */
  share: ReactNode;
  /** The quiet second: Back. */
  back: ReactNode;
  replayLabel: string;
}) {
  const { quiet } = useMotionGate();
  const [run, setRun] = useState(0);
  const titleId = useId();

  useEffect(() => {
    if (quiet) return;
    /* The haptic lands with the pop, after the medal's 620ms arrival. */
    const timer = window.setTimeout(() => feedback("success"), 620);
    return () => window.clearTimeout(timer);
  }, [run, quiet]);

  return (
    <section className="nf-earned" data-quiet={quiet ? "" : undefined} aria-labelledby={titleId}>
      <button
        type="button"
        className="nf-earned__stage"
        aria-label={replayLabel}
        onClick={() => setRun((n) => n + 1)}
      >
        {/* Keyed by the run, so a tap restarts the CSS entrance exactly once. */}
        <span key={run} className="nf-earned__play" aria-hidden="true">
          <span className="nf-earned__rays" />
          <span className="nf-earned__medal">
            <BrandIcon name="rosette" fill drawn={160} priority />
          </span>
        </span>
      </button>
      <div className="nf-earned__words">
        <h2 id={titleId} className="nf-earned__title">
          {title}
        </h2>
        <p className="nf-earned__meaning">{meaning}</p>
      </div>
      <div className="nf-earned__actions">
        {share}
        {back}
      </div>
    </section>
  );
}
