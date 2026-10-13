import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OPEN_BEATS, THRESHOLD_GOING_MS } from "./threshold";

/*
 * The threshold kinds, and the `open` kind in particular (Session 3).
 *
 * `open` is named before its sequence is built (see the note on OPEN_BEATS),
 * so what can be checked today is that the data matches MOTION_SYSTEM.md
 * section 3 and that the CSS hook it promises really exists. When the
 * sequence lands, these are the numbers it is held to.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const THRESHOLD_CSS = readFileSync(join(HERE, "..", "..", "app", "css", "threshold.css"), "utf8");

describe("the threshold kinds", () => {
  it("has door, leave and open, each with a going time", () => {
    expect(Object.keys(THRESHOLD_GOING_MS).sort()).toEqual(["door", "leave", "open"]);
  });

  it("gives the app opening exactly the 1,500ms the spec allows", () => {
    expect(THRESHOLD_GOING_MS.open).toBe(1500);
    expect(OPEN_BEATS.at(-1)?.to).toBe(1500);
  });

  it("starts each opening beat no earlier than the one before it, and never runs a beat backwards", () => {
    for (let i = 0; i < OPEN_BEATS.length; i += 1) {
      const beat = OPEN_BEATS[i]!;
      expect(beat.to, beat.beat).toBeGreaterThan(beat.from);
      if (i > 0) expect(beat.from, beat.beat).toBeGreaterThanOrEqual(OPEN_BEATS[i - 1]!.from);
    }
  });

  it("ends on the door, on the leave curve", () => {
    const door = OPEN_BEATS.at(-1)!;
    expect(door.beat).toBe("door");
    expect(door.curve).toBe("leave");
  });

  it("has a CSS hook for the opening, with a 160ms reduced-motion crossfade", () => {
    expect(THRESHOLD_CSS).toMatch(/:root\[data-arrive="open"\] #main \{/);
    expect(THRESHOLD_CSS).toMatch(/nf-threshold-open-fade 160ms/);
  });
});
