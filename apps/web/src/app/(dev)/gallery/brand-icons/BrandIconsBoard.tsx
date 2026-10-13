"use client";

import { Button } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { TIERED_OBJECTS, type TieredObjectName } from "@/design-system/icons/object-assets";
import { Section, setRootTheme, Specimen, SystemFrame, useRootTheme } from "../_system/SystemFrame";

/**
 * THE TIERED BRAND OBJECTS (D29, two-tier assets), every one, on night and on
 * paper.
 *
 *   tier B  symbols: simple, matte, deep royal blue, one orange accent at most
 *   tier A  real things: buildings, land, Nigerian infrastructure, rich and
 *           realistic; plus two wide scenes drawn on their own large canvas
 *
 * The names under the objects are the file stems, which is what a call site
 * passes to `BrandIcon`: the only labels the artwork has.
 *
 * ON NIGHT the ground paints nothing: the artwork was accepted against the navy
 * canvas. ON PAPER a matte or realistic object stands on the GROUND PLATE
 * (radius 14, about 4 percent brand fill, a soft blue contact shadow) so it
 * never floats on bare paper; `BrandIcon` writes `data-material` and
 * `light.css` draws the plate. That rule is keyed on a Light ROOT, so the Paper
 * panel is only drawn while the page is Light: a Light subtree cannot be forced
 * inside a dark page, and an object shown on paper without its plate would be
 * a false picture. Switch the theme above or press the button.
 *
 * The scenes are not icons and belong in hero slots, not rows; they are shown
 * larger for that reason.
 */

type Entry = { name: TieredObjectName; file: string };

const ALL: readonly Entry[] = (Object.entries(TIERED_OBJECTS) as [TieredObjectName, { tier: "a" | "b"; file: string }][]).map(
  ([name, asset]) => ({ name, file: asset.file }),
);
const isScene = (e: Entry) => e.file.startsWith("scene/");
const MATTE = ALL.filter((e) => TIERED_OBJECTS[e.name].tier === "b");
const REAL = ALL.filter((e) => TIERED_OBJECTS[e.name].tier === "a" && !isScene(e));
const SCENES = ALL.filter(isScene);

function Grid({ entries, size }: { entries: readonly Entry[]; size: number }) {
  return (
    <ul className={size >= 128 ? "nf-sg-objects nf-sg-objects--large" : "nf-sg-objects"}>
      {entries.map((e) => (
        <li key={e.name} className="nf-sg-object">
          <BrandIcon name={e.name} size={size} />
          <span className="nf-sg-object__name">{e.name}</span>
        </li>
      ))}
    </ul>
  );
}

function Everything({ title }: { title: string }) {
  return (
    <>
      <h3 className="nf-sg-label">{title}: tier B, matte symbols ({MATTE.length})</h3>
      <Grid entries={MATTE} size={56} />
      <h3 className="nf-sg-label">{title}: tier A, real things ({REAL.length})</h3>
      <Grid entries={REAL} size={56} />
      <h3 className="nf-sg-label">{title}: tier A scenes ({SCENES.length}), hero slots only</h3>
      <Grid entries={SCENES} size={160} />
    </>
  );
}

export function BrandIconsBoard() {
  const theme = useRootTheme();
  const first = MATTE[0]?.name;
  const place = REAL[0]?.name;
  return (
    <SystemFrame
      slug="brand-icons"
      title="Brand icons"
      lede="Every tiered object BrandIcon can draw, on the night canvas and on paper with the ground plate. Objects are named by their file stem."
    >
      <Section
        title="On night"
        note="A data-theme dark region: the ground paints nothing, because the artwork was accepted against navy."
      >
        <div data-theme="dark" className="nf-sg-desk">
          <Everything title="Night" />
        </div>
      </Section>

      <Section
        title="On paper, with the ground plate"
        note="Radius 14, about 4 percent brand fill, a soft blue contact shadow. Only drawn while the page is Light."
      >
        {theme === "light" ? (
          <div className="nf-sg-desk">
            <Everything title="Paper" />
          </div>
        ) : (
          <div className="nf-sg-row">
            <p className="nf-sg-readout">The ground plate belongs to a Light page.</p>
            <Button variant="primary" size="sm" onClick={() => setRootTheme("light")}>
              Show on paper
            </Button>
          </div>
        )}
      </Section>

      <Section title="Sizes" note="The object is drawn at the size given and its ground adds a few pixels of padding around it. Artwork sourced at 160 to 290px is honest up to about 128px; the scenes are the large ones.">
        <div className="nf-sg-grid">
          {first ? (
            <Specimen label="A matte symbol at 24, 32, 56 and 96">
              <div className="nf-sg-row">
                {[24, 32, 56, 96].map((size) => (
                  <BrandIcon key={size} name={first} size={size} />
                ))}
              </div>
            </Specimen>
          ) : null}
          {place ? (
            <Specimen label="A real thing at 24, 32, 56 and 96">
              <div className="nf-sg-row">
                {[24, 32, 56, 96].map((size) => (
                  <BrandIcon key={size} name={place} size={size} />
                ))}
              </div>
            </Specimen>
          ) : null}
        </div>
      </Section>
    </SystemFrame>
  );
}
