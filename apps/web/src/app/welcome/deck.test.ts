import { describe, expect, it } from "vitest";
import { cardPose, settleTarget } from "./deck";

describe("cardPose", () => {
  it("draws the current card whole and in place", () => {
    const pose = cardPose(0, 0);
    expect(pose["--gs-d"]).toBe("0.0000");
    expect(pose["--gs-type-o"]).toBe("1.000");
    expect(pose["--gs-scene-o"]).toBe("1.000");
    expect(pose["--gs-obj-o"]).toBe("1.000");
    expect(pose.visibility).toBe("visible");
  });
  it("puts the next card one width to the right, its scene and object faded out", () => {
    const pose = cardPose(1, 0);
    expect(pose["--gs-d"]).toBe("1.0000");
    expect(pose["--gs-scene-o"]).toBe("0.000");
    expect(pose["--gs-obj-o"]).toBe("0.000");
    expect(pose.visibility).toBe("visible");
  });
  it("hides cards more than a card and a half away", () => {
    expect(cardPose(3, 0).visibility).toBe("hidden");
    expect(cardPose(2, 0.6).visibility).toBe("visible");
  });
  it("crossfades both scenes halfway through a swipe", () => {
    expect(cardPose(0, 0.5)["--gs-scene-o"]).toBe("0.500");
    expect(cardPose(1, 0.5)["--gs-scene-o"]).toBe("0.500");
  });
});

describe("settleTarget", () => {
  it("returns to the start on a short, slow drag", () => {
    expect(settleTarget(1, 1.1, 0, 4)).toBe(1);
    expect(settleTarget(1, 0.9, 0, 4)).toBe(1);
  });
  it("moves one card on a quarter-width drag, either way", () => {
    expect(settleTarget(1, 1.3, 0, 4)).toBe(2);
    expect(settleTarget(1, 0.7, 0, 4)).toBe(0);
  });
  it("follows a throw even when the drag was short (left is forward)", () => {
    expect(settleTarget(1, 1.05, -900, 4)).toBe(2);
    expect(settleTarget(1, 0.95, 900, 4)).toBe(0);
  });
  it("never moves more than one card, and never past either end", () => {
    expect(settleTarget(1, 2.9, -3000, 4)).toBe(2);
    expect(settleTarget(0, -0.4, 2000, 4)).toBe(0);
    expect(settleTarget(3, 3.3, -2000, 4)).toBe(3);
  });
});
