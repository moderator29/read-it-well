import { describe, expect, it } from "vitest";
import { SPRING_SNAPPY, SPRING_SOFT, flickDirection, isSettled, releaseVelocity, rubber, stepSpring } from "./spring";

function settleTime(from: number, config = SPRING_SNAPPY, fps = 60): { ms: number; overshoot: number } {
  let x = from;
  let v = 0;
  let overshoot = 0;
  for (let frame = 1; frame < 600; frame++) {
    [x, v] = stepSpring(x, v, 0, 1 / fps, config);
    if (Math.sign(x) !== Math.sign(from)) overshoot = Math.max(overshoot, Math.abs(x));
    if (isSettled(x, v, 0)) return { ms: (frame * 1000) / fps, overshoot };
  }
  return { ms: Infinity, overshoot };
}

describe("the hand spring", () => {
  it("brings a dragged card home quickly and without a wobble", () => {
    const { ms, overshoot } = settleTime(120);
    expect(ms).toBeLessThan(700);
    expect(overshoot).toBeLessThan(6);
  });

  it("stays stable at 120 frames a second and on a slow 30", () => {
    expect(settleTime(200, SPRING_SOFT, 120).ms).toBeLessThan(1500);
    expect(settleTime(200, SPRING_SOFT, 30).ms).toBeLessThan(1500);
  });

  it("stretches like rubber: free at first, never past its limit", () => {
    expect(rubber(0, 60)).toBe(0);
    expect(rubber(10, 60)).toBeGreaterThan(4);
    expect(rubber(10_000, 60)).toBeLessThan(60);
    expect(rubber(-10_000, 60)).toBeGreaterThan(-60);
    expect(rubber(40, 0)).toBe(0);
  });

  it("reads the release speed from the last moment of the drag", () => {
    const samples = [
      { t: 0, x: 0, y: 0 },
      { t: 500, x: 10, y: 0 },
      { t: 540, x: 50, y: 4 },
      { t: 580, x: 90, y: 8 },
    ];
    const { vx, vy } = releaseVelocity(samples);
    expect(vx).toBeCloseTo(1000, 0);
    expect(vy).toBeCloseTo(100, 0);
    expect(releaseVelocity([{ t: 0, x: 0, y: 0 }])).toEqual({ vx: 0, vy: 0 });
  });

  it("calls a sideways throw a flick and an upward drag not one", () => {
    expect(flickDirection(-120, 10, 0)).toBe(1);
    expect(flickDirection(120, 10, 0)).toBe(-1);
    expect(flickDirection(-20, 0, -900)).toBe(1);
    expect(flickDirection(-20, 0, -100)).toBe(0);
    expect(flickDirection(-90, 200, -900)).toBe(0);
  });
});
