import "@/app/css/status-track.css";
import "./status-shapes.css";
import type { TrackState } from "./tracks";
import { trackPosition } from "./tracks";

/**
 * THE STATUS TRACK: one stepper for every record that moves through stages
 * (spec section 14, reference 36; plan item 21).
 *
 * It draws and decides nothing. The steps arrive with their state already
 * worked out (`tracks.ts`, or `threads/booking-steps.ts` for a stay) and their
 * time already formatted by the page, which knows the locale. A step whose
 * moment the record does not hold arrives with no `when`, and the track prints
 * a quiet dash for a step still ahead and nothing at all for one behind: a
 * time is never made up to fill the gap.
 *
 * Colour is never the only signal, and the shapes are StatusChip's: done is a
 * filled disc with a tick, current a ring with a filled centre and a heavier
 * label, upcoming a hollow ring, failed a filled square with a cross (the
 * chip's "failed" square, `status-shapes.css`). A greyscale screenshot reads the same as the colour one, and
 * a screen reader hears "Step 2 of 4" and each step's state in words.
 *
 * Vertical by default; horizontal once the track itself is wide enough for its
 * step count (a container query in `status-track.css`), so it is right both
 * full width on a page and inside a narrow thread panel.
 */

export type TrackStep = {
  key: string;
  label: string;
  /** Already formatted for the reader. Absent when the record holds no time. */
  when?: string | null;
  /** One short line under the label, when the step needs one. */
  note?: string | null;
  state: TrackState;
};

const SPOKEN: Record<TrackState, string> = {
  done: "done",
  current: "in progress",
  upcoming: "not yet",
  failed: "stopped here",
};

function Tick() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.2 5 8.6 9.5 3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M3.5 3.5 8.5 8.5M8.5 3.5 3.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The connector from a step to the next: solid into a step that was reached,
 * dashed into one still ahead, none out of a failed step or anything after it.
 */
function linkFrom(index: number, steps: readonly TrackStep[], failedAt: number): "solid" | "dashed" | "none" {
  if (failedAt >= 0 && index >= failedAt) return "none";
  const next = steps[index + 1];
  if (!next) return "none";
  if (next.state === "done" || next.state === "current" || next.state === "failed") return "solid";
  return "dashed";
}

export function StatusTrack({
  steps,
  label,
  title,
  meta,
  className,
  testId,
}: {
  steps: readonly TrackStep[];
  /** The accessible name of the list, e.g. "Booking progress". */
  label: string;
  /** The small caps title above the track ("Live status"). Omit for none. */
  title?: string;
  /** The right side of the head, e.g. "Updated 6 min ago", only from a real time. */
  meta?: string | null;
  className?: string;
  testId?: string;
}) {
  const states = steps.map((step) => step.state);
  const failedAt = states.indexOf("failed");
  const position = trackPosition(states);
  const at = steps[position.index - 1];

  return (
    <div
      className={className ? `nf-track ${className}` : "nf-track"}
      data-steps={steps.length}
      data-stopped={failedAt >= 0 ? "" : undefined}
      data-testid={testId}
    >
      {(title || meta) && (
        <div className="nf-track__head">
          {title ? <p className="nf-track__title">{title}</p> : <span />}
          {meta ? <p className="nf-track__meta">{meta}</p> : null}
        </div>
      )}
      <ol
        className="nf-track__list"
        aria-label={
          at ? `${label}: step ${position.index} of ${position.total}, ${at.label}` : label
        }
      >
        {steps.map((step, index) => {
          const ahead = step.state === "upcoming";
          const when = step.when && step.when.length > 0 ? step.when : null;
          return (
            <li
              key={step.key}
              className="nf-track__step"
              data-state={step.state}
              data-link={linkFrom(index, steps, failedAt)}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <span className="nf-track__node" aria-hidden="true">
                {step.state === "done" ? <Tick /> : step.state === "failed" ? <Cross /> : null}
              </span>
              <span className="nf-track__text">
                <span className="nf-track__label">
                  {step.label}
                  <span className="sr-only">, {SPOKEN[step.state]}</span>
                </span>
                {when ? (
                  <span className="nf-track__when">{when}</span>
                ) : ahead && failedAt < 0 ? (
                  <span className="nf-track__when" aria-hidden="true">
                    -
                  </span>
                ) : null}
              </span>
              {step.note ? <span className="nf-track__note">{step.note}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
