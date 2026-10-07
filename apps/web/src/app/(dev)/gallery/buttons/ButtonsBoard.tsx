"use client";

import { useEffect, useRef, useState } from "react";

import { Button, MORPH_SETTLE_MS, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * BUTTON ROLES AND THE ACTION MORPH (D2, north star motion 7, reference 7061).
 *
 * Roles first: a text button is a rounded rectangle, radius 14 by default (the
 * shape law); icon buttons are circles; nothing is a pill. Then the morph, the
 * opt-in for the one action a screen exists for when it is confirm, verify,
 * unlock, release or earn: loading closes the button to a circle and draws an
 * arc ONCE which then holds still however long the wait (never a spinner), done
 * closes the ring and draws the tick, and letting go of both settles it back to
 * the rectangle on a 240ms curve. The box never changes size.
 *
 * `done` is the server's word, never the press's. The sequence below stands in
 * for a server answering after a beat; in the product the caller passes `done`
 * only once the thing really happened.
 *
 * `loading` WITHOUT `morph` draws the same ring in the leading slot (once to
 * three quarters, then held; there is no looping spinner any more), and a
 * plain control that is not a Button draws it through `PendingRing`.
 */

const ROLES: readonly { variant: ButtonVariant; label: string }[] = [
  { variant: "primary", label: "Primary" },
  { variant: "secondary", label: "Secondary" },
  { variant: "quiet", label: "Quiet" },
  { variant: "danger", label: "Danger" },
  { variant: "dangerQuiet", label: "Danger quiet" },
];

const SIZES: readonly ButtonSize[] = ["sm", "md", "lg"];

type Phase = "idle" | "loading" | "done" | "settle";

function MorphSequence() {
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);
  const clear = () => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const run = () => {
    clear();
    setPhase("loading");
    const at = (ms: number, next: Phase) => timers.current.push(window.setTimeout(() => setPhase(next), ms));
    at(1400, "done");
    at(2600, "settle");
    at(2600 + MORPH_SETTLE_MS, "idle");
  };

  return (
    <Specimen label="The sequence: idle, loading, done, settle">
      <div className="nf-sg-row">
        <Button variant="primary" morph loading={phase === "loading"} done={phase === "done"} onClick={run}>
          Action label
        </Button>
        <p className="nf-sg-readout" aria-live="polite">
          State: {phase}
        </p>
      </div>
      <p className="nf-sg-note">
        Press it. Loading holds 1.4 seconds, done holds 1.2 seconds, then it settles for 240ms. A stand-in for a server.
      </p>
    </Specimen>
  );
}

export function ButtonsBoard() {
  return (
    <SystemFrame
      slug="buttons"
      title="Buttons"
      lede="Rounded rectangles at radius 14, sentence case, 44px at the smallest. Icon buttons are circles. One primary per screen."
    >
      <Section title="Roles and sizes" note="Rows are roles, columns are the three sizes (44, 48 and 56px).">
        <div className="nf-sg-grid nf-sg-grid--wide">
          {ROLES.map((role) => (
            <Specimen key={role.variant} label={role.label}>
              <div className="nf-sg-row">
                {SIZES.map((size) => (
                  <Button key={size} variant={role.variant} size={size}>
                    Label {size}
                  </Button>
                ))}
              </div>
            </Specimen>
          ))}
          <Specimen label="Icon, square and round (aria-label required)">
            <div className="nf-sg-row">
              <Button variant="icon" leadingIcon="share" aria-label="Icon action" />
              <Button variant="icon" round leadingIcon="close" aria-label="Round icon action" />
            </div>
          </Specimen>
        </div>
      </Section>

      <Section title="Slots and states" note="Leading and trailing icons, the arrow that nudges on hover, the glow budget (one per view), full width and disabled.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          <Specimen label="Leading icon">
            <Button variant="secondary" leadingIcon="document">
              Label
            </Button>
          </Specimen>
          <Specimen label="Trailing icon">
            <Button variant="secondary" trailingIcon="chevron-right">
              Label
            </Button>
          </Specimen>
          <Specimen label="Arrow">
            <Button variant="primary" arrow>
              Label
            </Button>
          </Specimen>
          <Specimen label="Glow, the one lit action">
            <Button variant="primary" glow>
              Label
            </Button>
          </Specimen>
          <Specimen label="Full width">
            <Button variant="primary" full>
              Label
            </Button>
          </Specimen>
          <Specimen label="Disabled">
            <div className="nf-sg-row">
              <Button variant="primary" disabled>
                Label
              </Button>
              <Button variant="secondary" disabled>
                Label
              </Button>
            </div>
          </Specimen>
        </div>
      </Section>

      <Section
        title="The action morph"
        note="Opt in with morph on the one action a screen exists for. The three fixed specimens are the held states; the sequence plays all four, including the settle you cannot hold."
      >
        <div className="nf-sg-grid nf-sg-grid--wide">
          <Specimen label="Idle">
            <Button variant="primary" morph>
              Action label
            </Button>
          </Specimen>
          <Specimen label="Loading: the arc is drawn once and holds">
            <Button variant="primary" morph loading>
              Action label
            </Button>
          </Specimen>
          <Specimen label="Done: ring closed, tick drawn">
            <Button variant="primary" morph done>
              Action label
            </Button>
          </Specimen>
          <MorphSequence />
        </div>
        <p className="nf-sg-note">Switch Motion to Calm or Off and press the sequence: the states change with no travel.</p>
      </Section>
    </SystemFrame>
  );
}
