import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  UI_ICON_NAMES,
  UI_ICON_SIZES,
  UI_ICON_STROKE_PX,
  uiIconHasFill,
  uiIconStrokeWidth,
} from "./UiIcon";

/**
 * THE BOLD PASS (29 September 2026), held in place.
 *
 * The founder asked for bolder, solid icons at about 2px on a 24px glyph, with
 * the line stepped by size. These specs catch the three ways that decays: the
 * weight quietly slides back to the old 1.5, a size step renders a line the
 * scale does not name, or a glyph the listing page draws goes missing from the
 * set or from the checked-in vectors that `scripts/build-icon-vectors.mjs`
 * writes.
 */

const repoRoot = join(__dirname, "../../../../..");

function renderedPx(edge: number) {
  return (uiIconStrokeWidth(edge) * edge) / 24;
}

describe("UiIcon weight", () => {
  it("draws 2 CSS px at the 20 and 24 steps", () => {
    expect(UI_ICON_STROKE_PX).toBe(2);
    expect(renderedPx(24)).toBeCloseTo(2);
    expect(renderedPx(20)).toBeCloseTo(2);
  });

  it("steps the line with the size, never thinner than 1.5 or backwards", () => {
    const lines = UI_ICON_SIZES.map(renderedPx);
    expect(lines[0]).toBeCloseTo(1.5);
    for (let i = 1; i < lines.length; i += 1) {
      expect(lines[i]).toBeGreaterThanOrEqual(lines[i - 1]);
    }
    // Every step lands on a quarter pixel, so it sits on the device grid at 2x.
    for (const px of lines) expect((px * 4) % 1).toBeCloseTo(0);
  });

  it("takes an off-scale size's weight from its nearest step", () => {
    expect(renderedPx(22)).toBeCloseTo(renderedPx(24));
    expect(renderedPx(14)).toBeCloseTo(renderedPx(16));
  });
});

describe("UiIcon set", () => {
  const listingGlyphs = ["coins", "scale", "certificate", "stamp", "survey", "droplet", "gate", "bolt"];

  it("carries every glyph the listing detail rows draw", () => {
    for (const name of listingGlyphs) expect(UI_ICON_NAMES).toContain(name);
  });

  it("has a solid twin for the new row glyphs that have a closed shape", () => {
    for (const name of ["droplet", "certificate", "stamp", "survey", "sun", "briefcase"] as const) {
      expect(uiIconHasFill(name)).toBe(true);
    }
  });

  it("matches the checked-in vector exports, one file per name at the new weight", () => {
    for (const name of UI_ICON_NAMES) {
      const file = join(repoRoot, "assets/icons/ui", `${name}.svg`);
      expect(existsSync(file), `assets/icons/ui/${name}.svg`).toBe(true);
      expect(readFileSync(file, "utf8")).toContain(`stroke-width="${UI_ICON_STROKE_PX}"`);
    }
  });
});
