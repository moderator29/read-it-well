"use client";

import { useState } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { Amount, Figure } from "@/components/ui/Amount";
import { Button } from "@/components/ui/Button";
import { HeroFigure } from "@/components/ui/HeroFigure";
import { Odometer } from "@/components/ui/Odometer";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * FIGURE, AMOUNT, COUNTUP AND ODOMETER (north star motions 4 and 5).
 *
 * THE ONLY NUMBER ON THIS BOARD IS THE VIEWER'S OWN. The test value below is
 * typed or stepped by whoever is looking, starts at a plain run of digits, and
 * is labelled as a test value, because the figures cannot be seen turning
 * without some digits to turn. Nothing here is a balance, a price, a count of
 * anything real or an id, and the money specimen is that same test value put
 * through the product's own `Amount`, so it shows how money is SET, not how
 * much of it there is.
 *
 * What to look for, in order: the mount count (0 to the value once, 620ms on
 * the glide curve), then the roll (only the digits that changed turn, 380ms,
 * 20ms apart, up when the value rose and down when it fell), then Calm and Off
 * in the Motion switch, where every figure simply lands.
 */

const STEP = 111;
const START = 1234;
const TAG = "en-NG";

export function FiguresBoard() {
  const [value, setValue] = useState(START);
  /* A turn counter that remounts the mount-count specimens on request. */
  const [mount, setMount] = useState(0);
  const set = (next: number) => setValue(Math.max(0, Math.min(9_999_999, Math.round(next))));
  const text = new Intl.NumberFormat(TAG).format(value);

  return (
    <SystemFrame
      slug="figures"
      title="Figures"
      lede="A figure counts once when it arrives and rolls only the digits that changed afterwards. The number is a test value you control; it is not data."
    >
      <Section title="The test value" note="Type a number or step it. Everything below reads from it.">
        <div className="nf-sg-row">
          <label className="nf-sg-label" htmlFor="sg-test-value">
            Test value
          </label>
          <input
            id="sg-test-value"
            className="nf-sg-field"
            type="number"
            inputMode="numeric"
            min={0}
            max={9999999}
            value={value}
            onChange={(e) => set(Number(e.target.value))}
          />
          <Button variant="glass" size="sm" onClick={() => set(value + STEP)}>
            Step up
          </Button>
          <Button variant="glass" size="sm" onClick={() => set(value - STEP)}>
            Step down
          </Button>
          <Button variant="quiet" size="sm" onClick={() => set(START)}>
            Reset
          </Button>
        </div>
      </Section>

      <Section
        title="Mount count"
        note="CountUp counts from 0 to the value once, on first view, and the server prints the final figure so nothing depends on the count. Mount again to see it."
      >
        <div className="nf-sg-row">
          <Button variant="primary" size="sm" onClick={() => setMount((n) => n + 1)}>
            Mount again
          </Button>
        </div>
        <div className="nf-sg-grid">
          <Specimen label="CountUp, eager">
            <CountUp key={`c${mount}`} value={value} tag={TAG} eager className="nf-h2" />
          </Specimen>
          <Specimen label="Figure with count and a muted suffix">
            <Figure key={`f${mount}`} value={value} suffix="suffix" count className="nf-h2" />
          </Specimen>
          <Specimen label="Amount with count, through formatMoney">
            <Amount key={`a${mount}`} minorUnits={value * 100} count className="nf-h2" />
          </Specimen>
          <Specimen label="HeroFigure, the shared hero material">
            <HeroFigure key={`h${mount}`} caption="Caption slot" sub="One quiet line">
              <CountUp value={value} tag={TAG} eager />
            </HeroFigure>
          </Specimen>
        </div>
      </Section>

      <Section
        title="Value change"
        note="After the first count a changed value never recounts: the digits that changed roll to their new values. Money rolls only when the caller passes a confirmed amount, never an optimistic one, so these step only when you press a button."
      >
        <div className="nf-sg-grid">
          <Specimen label="Odometer on a printed figure">
            <Odometer value={text} className="nf-h2" />
          </Specimen>
          <Specimen label="CountUp, changed after its count">
            <CountUp value={value} tag={TAG} eager className="nf-h2" />
          </Specimen>
          <Specimen label="Amount with count, changed after its count">
            <Amount minorUnits={value * 100} count className="nf-h2" />
          </Specimen>
        </div>
      </Section>

      <Section
        title="Static figures"
        note="Tabular numerals, the muted tail for kobo and a suffix, and the compact forms for dense rows. No motion."
      >
        <div className="nf-sg-grid">
          <Specimen label="Figure with suffix">
            <Figure value={value} suffix="suffix" className="nf-h3" />
          </Specimen>
          <Specimen label="Amount, whole naira">
            <Amount minorUnits={value * 100} className="nf-h3" />
          </Specimen>
          <Specimen label="Amount, showFraction and a suffix">
            <Amount minorUnits={value * 100 + 50} showFraction suffix="suffix" className="nf-h3" />
          </Specimen>
          <Specimen label="Amount, compact">
            <Amount minorUnits={value * 100 * 1000} compact className="nf-h3" />
          </Specimen>
        </div>
      </Section>

      <Section
        title="Reduced motion"
        note="Switch Motion to Calm or Off above, then mount again and step. Every figure lands on its final value at once; no count, no roll. The operating system's own reduced-motion setting does the same."
      >
        <p className="nf-sg-readout">Calm and Off are what reduced motion collapses to, so this is the check.</p>
      </Section>
    </SystemFrame>
  );
}
