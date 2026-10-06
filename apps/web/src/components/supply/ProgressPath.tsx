"use client";

import "./progress-path.css";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * THE WIZARD'S PROGRESS PATH (reference 7110, north star 10 G/H, ADAPT: "course
 * modules, progress path with ticks" becomes a lister's steps).
 *
 * Every step of the flow on one vertical path, in the flow's own order and
 * words (D28: the steps are the wizard's, unchanged; this only shows them).
 * A step behind the member is done: a filled node with a tick, and a button
 * that takes them back to it, the same jump the rail's segments make. The
 * step they are on is a ring and carries `aria-current="step"`. Steps ahead
 * are hollow and not buttons, because the wizard does not let anybody skip
 * forward past what it has not saved.
 *
 * State by shape and words, never colour alone: filled with a tick, ring,
 * hollow, and each row's state said to assistive technology. No motion of its
 * own; it opens inside the ported `Unfold`, whose motion it inherits.
 */
export type PathStep = { id: string; label: string };

export function ProgressPath({
  steps,
  at,
  onJump,
  disabled = false,
  copy,
}: {
  steps: readonly PathStep[];
  /** The index of the step the member is on. */
  at: number;
  onJump: (index: number) => void;
  disabled?: boolean;
  copy: { done: string; current: string; upcoming: string };
}) {
  return (
    <ol className="nf-path">
      {steps.map((step, index) => {
        const state = index < at ? "done" : index === at ? "current" : "upcoming";
        const words = state === "done" ? copy.done : state === "current" ? copy.current : copy.upcoming;
        const body = (
          <>
            <span className="nf-path__node" aria-hidden="true">
              {state === "done" ? <UiIcon name="check" size={16} /> : null}
            </span>
            <span className="nf-path__text">
              <span className="nf-path__label">{step.label}</span>
              <span className="nf-path__state">{words}</span>
            </span>
          </>
        );
        return (
          <li key={step.id} className="nf-path__step" data-state={state} aria-current={state === "current" ? "step" : undefined}>
            {state === "done" ? (
              <button type="button" className="nf-path__row" onClick={() => onJump(index)} disabled={disabled}>
                {body}
              </button>
            ) : (
              <div className="nf-path__row">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
