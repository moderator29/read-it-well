import type { ReactNode } from "react";
import { BrandIcon, type BrandIconProp } from "@/design-system/icons/BrandIcon";
import { MomentDot } from "./kit";
import "@/app/css/money-layer.css";

/**
 * THE PATH (PREMIUM-STANDARD reference 2, "the shape for Vallo's multi-step
 * flows": financial onboarding, a deal from agreement to payment, a movement
 * on its way). Each step is a row: a 3D tile or its number on the left, a
 * title and a caption, and a round status on the right (a check when done, a
 * ring when it is the step in hand, a quiet ring when it is still to come).
 * A thin connector joins the steps and fills as they complete.
 *
 * A step is only ticked when its caller's record says so: this draws the
 * state it is given and never advances on its own (section 43).
 */
export type PathState = "done" | "current" | "waiting" | "problem" | "upcoming";

export type PathStep = {
  key: string;
  title: ReactNode;
  sub?: ReactNode;
  state: PathState;
  /** The 3D tile for the step (reference 2). Without it the step shows its number. */
  art?: BrandIconProp;
  /** Under the current step's words: its one action, or what it needs. */
  children?: ReactNode;
};

const SPOKEN: Record<PathState, string> = {
  done: "Done",
  current: "Now",
  waiting: "In progress",
  problem: "Needs attention",
  upcoming: "Still to come",
};

export function StepPath({ steps, label, compact = false, testId }: { steps: PathStep[]; label: string; compact?: boolean; testId?: string }) {
  return (
    <ol className="nf-path" aria-label={label} data-compact={compact ? "true" : undefined} data-testid={testId}>
      {steps.map((step, i) => (
        <li key={step.key} className="nf-path__step" data-state={step.state} data-done={step.state === "done" ? "true" : "false"}>
          <span className="nf-path__lead" aria-hidden="true">
            {step.art ? <BrandIcon name={step.art} size={compact ? 36 : 44} /> : <span className="nf-path__num">{i + 1}</span>}
          </span>
          <div className="nf-path__text">
            <p className="nf-path__title">
              {step.title}
              <span className="sr-only">, {SPOKEN[step.state]}</span>
            </p>
            {step.sub ? <p className="nf-path__sub">{step.sub}</p> : null}
            {step.children ? <div className="nf-path__more">{step.children}</div> : null}
          </div>
          <span className="nf-path__status">
            <MomentDot
              tone={step.state === "done" ? "done" : step.state === "problem" ? "problem" : step.state === "upcoming" ? "neutral" : "waiting"}
              live={step.state === "waiting"}
              size="sm"
            />
          </span>
        </li>
      ))}
    </ol>
  );
}
