import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EASE, FIGURE_ARRIVAL_MS, ODOMETER_MS, ODOMETER_STAGGER_MS, cubicBezier } from "./ease";

/*
 * The script curves are the stylesheet curves (Session 3). A figure counting
 * in `requestAnimationFrame` and the card it sits on must move on the same
 * curve, so the numbers here are read against tokens.css rather than trusted.
 */
const tokens = readFileSync(join(__dirname, "../../../../../packages/design-tokens/src/tokens.css"), "utf8");

describe("the motion curves in script", () => {
  it("starts at 0 and ends at 1", () => {
    for (const ease of Object.values(EASE)) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }
  });

  it("solves a cubic-bezier the way a browser does (linear is the identity)", () => {
    const linear = cubicBezier(0, 0, 1, 1);
    for (const p of [0.1, 0.25, 0.5, 0.9]) expect(linear(p)).toBeCloseTo(p, 5);
  });

  it("lands fast and leaves slow, as the names promise", () => {
    expect(EASE.land(0.2)).toBeGreaterThan(0.5);
    expect(EASE.leave(0.2)).toBeLessThan(0.1);
  });

  it("uses exactly the token values for every named curve", () => {
    const pairs: Array<[string, string]> = [
      ["--nf-ease-entrance", "0.16, 1, 0.3, 1"],
      ["--nf-ease-exit", "0.4, 0, 1, 1"],
      ["--nf-ease-standard", "0.22, 0.61, 0.36, 1"],
      ["--nf-ease-spring", "0.34, 1.28, 0.64, 1"],
      ["--nf-ease-whip", "0.7, 0, 0.2, 1"],
    ];
    for (const [token, args] of pairs) expect(tokens).toContain(`${token}: cubic-bezier(${args});`);
  });

  it("collapses the new whip curve under reduced motion", () => {
    const reduced = tokens.slice(tokens.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced.slice(0, reduced.indexOf("\n}\n"))).toContain("--nf-ease-whip: linear;");
  });

  it("keeps the figure timings the spec names", () => {
    expect(FIGURE_ARRIVAL_MS).toBe(620);
    expect(ODOMETER_MS).toBe(380);
    expect(ODOMETER_STAGGER_MS).toBe(20);
  });
});
