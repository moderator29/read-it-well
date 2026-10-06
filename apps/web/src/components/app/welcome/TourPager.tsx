"use client";

import type { CSSProperties } from "react";

/**
 * THE PAGER AS A SLIDING PILL (W11, 6 October 2026; the north star's "the
 * pager as a sliding pill", the founder's onboarding sheets).
 *
 * One small dot per page and one capsule that sits on the page you are on and
 * SLIDES to the next on the drift ease at 240ms (`--om-i` is its index; the
 * movement is a single `transform`, so it is interruptible and costs nothing).
 * The dots are real buttons (a 44px target each, the visible dot eight pixels
 * of it), each one a way to go straight to that page, so the pager is the
 * progress bar AND the way back to a page that the older segmented bar was.
 * `aria-current="step"` marks the page; `FirstRun` announces every change from
 * its one live region, so this says nothing on its own.
 *
 * Under reduced motion, Calm and Off the capsule is simply where it should be
 * (`onboarding-motion.css`).
 */
export function TourPager({
  total,
  index,
  label,
  stepName,
  onGo,
}: {
  total: number;
  index: number;
  /** The group's name (`onboardingMotion.progress`). */
  label: string;
  /** "Step 2 of 4", for one dot. */
  stepName: (i: number) => string;
  onGo: (i: number) => void;
}) {
  return (
    <div
      className="nf-om-pager"
      role="group"
      aria-label={label}
      style={{ "--om-n": total, "--om-i": index } as CSSProperties}
    >
      <span className="nf-om-pager__pill" aria-hidden="true" />
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          className="nf-om-pager__dot"
          aria-label={stepName(i)}
          aria-current={i === index ? "step" : undefined}
          data-reached={i <= index ? "" : undefined}
          onClick={() => onGo(i)}
          data-testid={`welcome-dot-${i + 1}`}
        />
      ))}
    </div>
  );
}
