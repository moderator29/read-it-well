"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Sheet } from "@/components/ui/Sheet";
import { Section, Specimen, SystemFrame } from "../_system/SystemFrame";

/**
 * THE FOUR CONTAINER TIERS (north star section 4, D28.2), each drawn from its
 * single definition point: the plate tokens, `Panel` (`.nf-panel`), `.nf-island`
 * and `Sheet` (`.nf-sheet`). Nothing on this board restyles a tier.
 *
 * Every tier is shown twice. The first row follows the page's theme, so the
 * Theme switch above turns the whole board between Night and Paper. The second
 * row sits in a `data-theme="dark"` subtree, which is night in either page
 * theme, so on Paper a reviewer sees both materials side by side (a Light
 * subtree cannot be forced inside a dark page: tokens.css only answers one
 * under a Light root).
 *
 * The labels name each tier's radius and its ONE edge treatment as the tokens
 * define them. The content inside is structural: slot names, never copy.
 */

function Tiers({ children }: { children: ReactNode }) {
  return <div className="nf-sg-grid nf-sg-grid--wide">{children}</div>;
}

function PlateSpecimen() {
  return (
    <Specimen label="Plate: radius 14, hairline">
      <div className="nf-sg-plate">Row slot</div>
    </Specimen>
  );
}

function CardSpecimen() {
  return (
    <Specimen label="Card: radius 18, hairline at night, shadow on Paper">
      <Panel variant="card">Card content slot</Panel>
    </Specimen>
  );
}

function FigureCardSpecimen() {
  return (
    <Specimen label="Card figure: radius 22, same edge">
      <Panel variant="card" className="nf-panel--figure">
        Card with a figure slot
      </Panel>
    </Specimen>
  );
}

function IslandSpecimen() {
  return (
    <Specimen label="Island: radius 28, ring at night, shadow on Paper">
      <div className="nf-sg-ground">
        <div className="nf-island p-md">Island content slot</div>
      </div>
    </Specimen>
  );
}

function ThemeRow() {
  return (
    <Tiers>
      <PlateSpecimen />
      <CardSpecimen />
      <FigureCardSpecimen />
      <IslandSpecimen />
    </Tiers>
  );
}

function SheetSpecimens() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tiers>
        <Specimen label="Sheet at rest: radius 32 on the leading corners, one edge">
          <div className="nf-sg-frame">
            <div className="nf-sheet" data-open="true" role="group" aria-label="Sheet tier at rest">
              <div className="nf-sheet__grip" aria-hidden="true" />
              <h3 className="shrink-0 px-gutter pb-sm text-[length:var(--nf-text-body-lg)] font-semibold tracking-tight text-[var(--nf-content-primary)]">
                Sheet title
              </h3>
              <div className="nf-sheet__body px-gutter pb-lg">Sheet body slot</div>
            </div>
          </div>
        </Specimen>
        <Specimen label="The real Sheet: rise, scrim, drag and focus are its own">
          <div className="nf-sg-row">
            <Button variant="primary" onClick={() => setOpen(true)}>
              Open the sheet
            </Button>
          </div>
          <p className="nf-sg-note">Drag the grip down to close, or press Escape.</p>
        </Specimen>
      </Tiers>
      <Sheet open={open} onOpenChange={setOpen} title="Sheet title" detents={[0.5]}>
        <p>Sheet body slot</p>
      </Sheet>
    </>
  );
}

export function ContainersBoard() {
  return (
    <SystemFrame
      slug="containers"
      title="Container tiers"
      lede="Four tiers only: Plate, Card, Island and Sheet, each with exactly one edge treatment. Switch the theme to see Night and Paper."
    >
      <Section
        title="In the page's theme"
        note="Follows the Theme switch above. At night the Card edge is the hairline; on Paper the hairline is transparent and the blue-tinted shadow is the only edge."
      >
        <ThemeRow />
      </Section>
      <Section
        title="Night subtree (always dark)"
        note="A data-theme dark subtree, so on Paper the night material is visible beside it."
      >
        <div data-theme="dark" className="nf-sg-desk">
          <ThemeRow />
        </div>
      </Section>
      <Section
        title="Sheet"
        note="The Sheet is fixed to the screen in the product, so the resting specimen is drawn in a frame that contains it. The second specimen opens the real one."
      >
        <SheetSpecimens />
      </Section>
    </SystemFrame>
  );
}
