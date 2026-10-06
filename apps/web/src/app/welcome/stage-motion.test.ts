import { describe, expect, it } from "vitest";
import { PULL_MAX, pullFor, tiltUnit } from "./stage-motion";

describe("Get Started's living depth", () => {
  it("turns a tilt into -1..1, so no layer ever passes its 6px ceiling", () => {
    expect(tiltUnit(0)).toBe(0);
    expect(tiltUnit(9)).toBe(0.5);
    expect(tiltUnit(90)).toBe(1);
    expect(tiltUnit(-90)).toBe(-1);
    expect(tiltUnit(null)).toBe(0);
    expect(tiltUnit(Number.NaN)).toBe(0);
  });

  it("stretches by 0.6 of a downward drag, capped, and never for an upward one", () => {
    expect(pullFor(50)).toBe(30);
    expect(pullFor(-40)).toBe(0);
    expect(pullFor(10_000)).toBe(PULL_MAX);
  });
});
