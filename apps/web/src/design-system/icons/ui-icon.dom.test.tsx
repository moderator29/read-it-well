import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  UI_ICON_NAMES,
  UI_ICON_SIZES,
  UI_ICON_STROKE_PX,
  UiIcon,
  uiIconHasFill,
  uiIconLeanStrokeWidth,
  uiIconStrokeWidth,
} from "./UiIcon";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * THE BOLD PASS (29 September 2026), held in place.
 *
 * The founder asked for bolder, solid icons at pump.fun's weight (2 to 2.25px
 * on a 24px glyph), with the line stepped by size; the ICONS3 audit took the
 * 20 and 24 steps to the top of that range. These specs catch the three ways that decays: the
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
  it("draws 2.25 CSS px at the 20 and 24 steps", () => {
    expect(UI_ICON_STROKE_PX).toBe(2.25);
    expect(renderedPx(24)).toBeCloseTo(2.25);
    expect(renderedPx(20)).toBeCloseTo(2.25);
  });

  it("keeps the small steps light enough to hold Lucide's counters", () => {
    expect(renderedPx(12)).toBeCloseTo(1.5);
    expect(renderedPx(16)).toBeCloseTo(1.75);
  });

  it("steps the line with the size, never thinner than 1.5 or backwards", () => {
    const lines = UI_ICON_SIZES.map((edge) => renderedPx(edge));
    expect(renderedPx(UI_ICON_SIZES[0])).toBeCloseTo(1.5);
    /* Pairwise without indexed access, so the check type-checks under
       `noUncheckedIndexedAccess` (an index read is `number | undefined`). */
    let previous = 0;
    for (const px of lines) {
      expect(px).toBeGreaterThanOrEqual(previous);
      previous = px;
    }
    // Every step lands on a quarter pixel, so it sits on the device grid at 2x.
    for (const px of lines) expect((px * 4) % 1).toBeCloseTo(0);
  });

  it("takes an off-scale size's weight from its nearest step", () => {
    expect(renderedPx(22)).toBeCloseTo(renderedPx(24));
    expect(renderedPx(14)).toBeCloseTo(renderedPx(16));
  });
});

describe("UiIcon lean weight (inner icons)", () => {
  const leanPx = (edge: number) => (uiIconLeanStrokeWidth(edge) * edge) / 24;

  it("is lighter than the nav chrome's bold line at every step, and steps up with the size", () => {
    let previous = 0;
    for (const edge of UI_ICON_SIZES) {
      expect(leanPx(edge)).toBeLessThan(renderedPx(edge));
      expect(leanPx(edge)).toBeGreaterThanOrEqual(previous);
      previous = leanPx(edge);
    }
    expect(leanPx(20)).toBeCloseTo(1.6);
  });

  it("renders lean by default and carries both widths for the chrome to switch", () => {
    const html = renderToStaticMarkup(<UiIcon name="bell" size={20} />);
    expect(html).toContain('class="nf-ui-icon"');
    expect(html).toContain(`stroke-width="${uiIconLeanStrokeWidth(20)}"`);
    expect(html).toContain(`--nf-sw-bold:${uiIconStrokeWidth(20)}`);
    expect(html).not.toContain("data-nf-weight");
  });

  it("pins a glyph when asked", () => {
    const html = renderToStaticMarkup(<UiIcon name="bell" size={20} weight="bold" />);
    expect(html).toContain('data-nf-weight="bold"');
    expect(html).toContain(`stroke-width="${uiIconStrokeWidth(20)}"`);
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
