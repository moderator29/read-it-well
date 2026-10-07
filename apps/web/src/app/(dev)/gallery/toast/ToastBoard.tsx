"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { TOAST_DWELL_LONG_MS, TOAST_DWELL_MS, toast } from "@/lib/ui/toast";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * THE ONE TOAST (north star motion 8, details pass).
 *
 * `ToastHost` is mounted once in the root layout and every call to `toast()`
 * draws there, so this board does not mount a second copy: the buttons fire
 * the real thing and it appears in its real place, above the dock on a phone
 * and bottom centre on a desk. Resize the window to see both.
 *
 * It rises 16px on `land` 240ms and leaves on `leave` 160ms; it dwells 2,400ms,
 * or 6,000ms for an error or an undo, and holding it stops the clock. Swipe it
 * sideways or down, or press Escape, to take it away. The newest message
 * replaces the one showing: a toast is what just happened, never a queue.
 *
 * The messages are slot names. A toast confirms something the person just did,
 * so a real one is the caller's sentence from the locale files.
 */
export function ToastBoard() {
  const [undone, setUndone] = useState(0);
  return (
    <SystemFrame
      slug="toast"
      title="Toast"
      lede="One store, one host, one placement. Press a button and watch where it lands."
    >
      <Section
        title="Tones"
        note={`Neutral and success dwell ${TOAST_DWELL_MS}ms. An error and anything with an action dwell ${TOAST_DWELL_LONG_MS}ms, and an error is announced at once.`}
      >
        <div className="nf-sg-grid nf-sg-grid--wide">
          <Specimen label="Neutral, polite">
            <div className="nf-sg-row">
              <Button variant="secondary" onClick={() => toast("Neutral message")}>
                Show neutral
              </Button>
            </div>
          </Specimen>
          <Specimen label="Success, a check">
            <div className="nf-sg-row">
              <Button variant="secondary" onClick={() => toast.success("Success message")}>
                Show success
              </Button>
            </div>
          </Specimen>
          <Specimen label="Error, a warning glyph, assertive">
            <div className="nf-sg-row">
              <Button variant="secondary" onClick={() => toast.error("Error message")}>
                Show error
              </Button>
            </div>
          </Specimen>
          <Specimen label="With an action">
            <div className="nf-sg-row">
              <Button
                variant="secondary"
                onClick={() => toast("Message with an action", { action: { label: "Action", run: () => setUndone((n) => n + 1) } })}
              >
                Show with action
              </Button>
              <p className="nf-sg-readout" aria-live="polite">
                Action taken: {undone} times
              </p>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section title="Replacement and dismissal" note="A new toast replaces the one on screen. Dismiss by swipe, Escape, or the call below.">
        <div className="nf-sg-row">
          <Button
            variant="quiet"
            onClick={() => {
              toast("First message");
              window.setTimeout(() => toast.success("Second message replaces it"), 500);
            }}
          >
            Fire two in a row
          </Button>
          <Button variant="quiet" onClick={() => toast.dismiss()}>
            Dismiss now
          </Button>
        </div>
      </Section>
    </SystemFrame>
  );
}
