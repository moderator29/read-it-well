"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * THE STATUS CHIP, EVERY STATE (north star sections 3 and 7, motion 20).
 *
 * The palette is one hue, so colour is never the only signal: each state has a
 * WORD, a SHAPE and a COLOUR. The word on this board is the state's own name,
 * because a real chip carries the caller's sentence from the locale files and
 * this board has none to borrow. Look at the shapes in greyscale: a filled
 * circle, a hollow circle, a filled square, a hollow square, a diamond and a
 * bar must still be six different things.
 *
 * Failed is the only red. Disputed is attention, never an error, so never red.
 * When the state changes, word, colour and shape change together on one 240ms
 * crossfade, never one before the others.
 */

const STATES: readonly { state: ChipState; word: string; meaning: string }[] = [
  { state: "success", word: "Success", meaning: "Finished and good: filled circle, emerald" },
  { state: "pending", word: "Pending", meaning: "Waiting on somebody: hollow circle, attention cyan" },
  { state: "failed", word: "Failed", meaning: "It did not happen: filled square, the only red" },
  { state: "protected", word: "Protected", meaning: "Held safe: hollow square, brand blue" },
  { state: "disputed", word: "Disputed", meaning: "Raised and being looked at: diamond, never red" },
  { state: "neutral", word: "Neutral", meaning: "No state at all: bar, grey" },
];

const SIZES = ["xs", "sm", "md"] as const;

function ChangeDemo() {
  const [index, setIndex] = useState(0);
  const current = STATES[index % STATES.length]!;
  return (
    <Specimen label="State change: label, colour and shape swap together">
      <div className="nf-sg-row">
        <StatusChip state={current.state} size="md" live>
          {current.word}
        </StatusChip>
        <Button variant="glass" size="sm" onClick={() => setIndex((i) => i + 1)}>
          Next state
        </Button>
      </div>
    </Specimen>
  );
}

export function StatusChipBoard() {
  return (
    <SystemFrame
      slug="status-chip"
      title="Status chip"
      lede="A state said three ways: a word, a shape and a colour. It presents a state the server has stated; it never decides one."
    >
      <Section title="Every state" note="Small, the size of a row. The meaning is the contract, not a sentence a member sees.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          {STATES.map((s) => (
            <Specimen key={s.state} label={s.meaning}>
              <div className="nf-sg-row">
                <StatusChip state={s.state}>{s.word}</StatusChip>
              </div>
            </Specimen>
          ))}
        </div>
      </Section>

      <Section title="Sizes" note="Extra small, small and medium. Nothing renders below 12px text.">
        <div className="nf-sg-grid nf-sg-grid--wide">
          {SIZES.map((size) => (
            <Specimen key={size} label={`Size ${size}`}>
              <div className="nf-sg-row">
                {STATES.map((s) => (
                  <StatusChip key={s.state} state={s.state} size={size}>
                    {s.word}
                  </StatusChip>
                ))}
              </div>
            </Specimen>
          ))}
        </div>
      </Section>

      <Section title="Changing in place" note="With live, a change is announced politely to assistive technology. Switch Motion to Calm to see the instant version.">
        <div className="nf-sg-grid">
          <ChangeDemo />
        </div>
      </Section>
    </SystemFrame>
  );
}
