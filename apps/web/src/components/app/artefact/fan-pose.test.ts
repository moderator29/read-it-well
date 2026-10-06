import { describe, expect, it } from "vitest";
import { fanPose, materialForStep } from "./fan-pose";

/** The fan's geometry and materials, held so a later edit cannot quietly break 14.4. */
describe("the fan", () => {
  it("puts the chosen credential forward, centred, whole and on top", () => {
    expect(fanPose(0)).toEqual({ x: 0, y: 0, scale: 1, turn: 0, opacity: 1, z: 10 });
  });

  it("recedes each step away in scale and opacity, to its own side", () => {
    const right = fanPose(1);
    const left = fanPose(-1);
    expect(right.x).toBeGreaterThan(0);
    expect(left.x).toBeLessThan(0);
    expect(right.scale).toBeLessThan(1);
    expect(right.opacity).toBeLessThan(1);
    expect(right.z).toBeLessThan(fanPose(0).z);
    expect(fanPose(2).opacity).toBeLessThan(right.opacity);
  });

  it("never fans past two steps, so a four-rung ladder stays on a phone", () => {
    expect(fanPose(3).x).toBe(fanPose(2).x);
    expect(fanPose(3).opacity).toBe(0);
  });

  it("gives a ladder one quiet material per standing, the warm edge only at the top", () => {
    expect([1, 2, 3, 4].map((step) => materialForStep(step, 4))).toEqual(["navy", "navy", "royal", "edge"]);
    expect([1, 2, 3].map((step) => materialForStep(step, 3))).toEqual(["navy", "royal", "edge"]);
  });
});
