import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The night glass containers (brand-glass.css section 5, tokens.css "THE
 * NIGHT GLASS CONTAINERS"): three tiers, night only, no backdrop blur on
 * anything that scrolls, and no outer glow under data saver or on a low-end
 * device.
 */
const tokens = readFileSync(join(__dirname, "../../../../../packages/design-tokens/src/tokens.css"), "utf8");
const glass = readFileSync(join(__dirname, "brand-glass.css"), "utf8");
const section = glass.slice(glass.indexOf("5. THE NIGHT GLASS CONTAINERS"));
const tokenBlock = tokens.slice(tokens.indexOf("THE NIGHT GLASS CONTAINERS"));

describe("the night glass container tier", () => {
  it("declares the three tiers in a night-only token block", () => {
    const head = tokenBlock.slice(tokenBlock.indexOf("*/") + 2, tokenBlock.indexOf("{"));
    expect(head).toContain(':root:not([data-theme="light"])');
    expect(head).not.toMatch(/:root\[data-theme="light"\]/);
    for (const tier of ["", "-raised", "-quiet"]) {
      for (const role of ["fill", "edge", "shadow", "radius"]) {
        expect(tokenBlock, `--nf-night-glass${tier}-${role}`).toContain(`--nf-night-glass${tier}-${role}:`);
      }
    }
  });

  it("drops the outer glow under data saver and on a low-end device", () => {
    const lite = tokenBlock.slice(tokenBlock.indexOf('[data-save-data="on"], [data-motion-lite="on"]'));
    const body = lite.slice(lite.indexOf("{"), lite.indexOf("}"));
    expect(body).toContain("--nf-night-glass-glow: 0 0 0 0 transparent");
    expect(body).toContain("--nf-night-glass-raised-glow: 0 0 0 0 transparent");
  });

  it("applies only at night and never adds a backdrop filter", () => {
    expect(section.length).toBeGreaterThan(0);
    expect(section).not.toMatch(/backdrop-filter\s*:/);
    const selectors = section.match(/^[^\n{}]*:root[^\n{]*/gm) ?? [];
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) expect(s).toContain(':root:not([data-theme="light"])');
  });

  it("quiets a container inside another glass container (no glow inside glow)", () => {
    const quiet = section.slice(section.indexOf("glass-quiet */"));
    const rule = quiet.slice(0, quiet.indexOf("}"));
    expect(rule).toContain("--nf-night-glass-quiet-shadow");
    expect(rule).not.toContain("--nf-night-glass-glow");
  });
});
