import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE STARTUP SEQUENCE DOES NOT LOOP (D31; MOTION_SYSTEM principle 10: nothing
 * loops), AND ITS DOOR IS THE STYLESHEET'S (round 5). Its hold used to run `infinite alternate` and relied on the script's
 * four second ceiling to open the door; a door held shut (W12 saw it on /check)
 * left the lockup breathing for ever. The hold is two passes now, ending at rest,
 * and this holds the sheet to it.
 */
const css = readFileSync(join(__dirname, "startup.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("startup.css", () => {
  it("has no infinite animation", () => {
    expect(css).not.toMatch(/\binfinite\b/);
  });

  /* Declared once since round 5: the door no longer re-declares the lockup's
     animation list, it is scheduled beside it (`--nf-startup-door`). */
  it("bounds the hold where it is declared, to two passes", () => {
    const holds = [...css.matchAll(/nf-startup-hold\s+\d+ms\s+var\(--nf-ease-standard\)\s+\d+ms\s+(\d+)\s+alternate/g)];
    expect(holds).toHaveLength(1);
    for (const hold of holds) expect(Number(hold[1])).toBe(2);
  });

  it("schedules every part of the door on the one number the script moves", () => {
    for (const name of ["nf-startup-door", "nf-startup-leaf-a", "nf-startup-leaf-b", "nf-startup-land", "nf-startup-settle", "nf-startup-out", "nf-startup-fade"]) {
      /* Every use in an animation list: the name, then its duration. */
      const uses = [...css.matchAll(new RegExp(`(?<![\\w-])${name}\\s+\\d+ms[^;,]*`, "g"))].map((m) => m[0]);
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use, name).toContain("var(--nf-startup-door)");
    }
  });
});
