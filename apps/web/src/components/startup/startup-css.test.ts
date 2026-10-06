import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE STARTUP SEQUENCE DOES NOT LOOP (D31; MOTION_SYSTEM principle 10: nothing
 * loops). Its hold used to run `infinite alternate` and relied on the script's
 * four second ceiling to open the door; a door held shut (W12 saw it on /check)
 * left the lockup breathing for ever. The hold is two passes now, ending at rest,
 * and this holds the sheet to it.
 */
const css = readFileSync(join(__dirname, "startup.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("startup.css", () => {
  it("has no infinite animation", () => {
    expect(css).not.toMatch(/\binfinite\b/);
  });

  it("bounds the hold in both places it is declared, at the same count", () => {
    const holds = [...css.matchAll(/nf-startup-hold\s+\d+ms\s+var\(--nf-ease-standard\)\s+\d+ms\s+(\d+)\s+alternate/g)];
    expect(holds).toHaveLength(2);
    for (const hold of holds) expect(Number(hold[1])).toBe(2);
  });
});
