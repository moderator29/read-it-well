import { describe, expect, it } from "vitest";
import {
  BLOOM_FAN_SHIFT_X,
  BLOOM_ITEM,
  BLOOM_MEASURED,
  BLOOM_PLUS,
  BLOOM_SPRING,
  bloomSlot,
  bloomTrail,
  bloomTransform,
  isSettled,
  stepSpring,
} from "./physics";

/** Runs the spring from rest towards a target in 16ms frames until it settles. */
function run(target: number, from = 0, maxFrames = 200) {
  let state = { value: from, velocity: 0 };
  const trace: number[] = [];
  for (let i = 0; i < maxFrames; i += 1) {
    state = stepSpring(state, target, 16);
    trace.push(state.value);
    if (isSettled(state, target)) break;
  }
  return { state, trace };
}

describe("the bloom spring", () => {
  it("overshoots its target once and settles on it", () => {
    const { state, trace } = run(1);
    const peak = Math.max(...trace);
    /* A spring with no overshoot is an easing curve wearing a costume. */
    expect(peak).toBeGreaterThan(1.02);
    expect(peak).toBeLessThan(1.2);
    expect(Math.abs(state.value - 1)).toBeLessThan(0.002);
    expect(isSettled(state, 1)).toBe(true);
  });

  it("settles inside half a second at 60fps", () => {
    const { trace } = run(1);
    expect(trace.length * 16).toBeLessThanOrEqual(500);
  });

  it("gives the same answer whatever the frame rate", () => {
    let slow = { value: 0, velocity: 0 };
    let fast = { value: 0, velocity: 0 };
    for (let i = 0; i < 10; i += 1) slow = stepSpring(slow, 1, 32);
    for (let i = 0; i < 20; i += 1) fast = stepSpring(fast, 1, 16);
    expect(Math.abs(slow.value - fast.value)).toBeLessThan(0.02);
  });

  it("survives a frame that took far too long", () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 1, 5000, BLOOM_SPRING);
    expect(Number.isFinite(state.value)).toBe(true);
    expect(state.value).toBeLessThan(1.5);
  });
});

describe("the bloom geometry", () => {
  it("is the founder's image, measured: centres and tilts as drawn, moved as one", () => {
    /* Centres in CSS px from the plus, tilts in degrees, off
       feed-plus-bloom-target.jpg at 0.5865 CSS px per image px. */
    const drawn = [
      { x: -0.7, y: -50.0, rotate: -13 },
      { x: -30.4, y: -84.0, rotate: -17 },
      { x: -63.5, y: -114.8, rotate: -20 },
    ];
    expect(BLOOM_MEASURED).toEqual(drawn);
    for (let i = 0; i < 3; i += 1) {
      const slot = bloomSlot(i);
      expect(slot.x).toBeCloseTo(drawn[i]!.x + BLOOM_FAN_SHIFT_X, 1);
      expect(slot.y).toBe(drawn[i]!.y);
      expect(slot.rotate).toBe(drawn[i]!.rotate);
    }
    /* Spacing along the arc is the render's, because the shift is uniform. */
    const gap = (a: number, b: number) =>
      Math.hypot(bloomSlot(b).x - bloomSlot(a).x, bloomSlot(b).y - bloomSlot(a).y);
    expect(gap(0, 1)).toBeCloseTo(Math.hypot(29.7, 34.0), 1);
    expect(gap(1, 2)).toBeCloseTo(Math.hypot(33.1, 30.8), 1);
  });

  it("fans up and to the left, each plate tilted more than the one nearer the thumb", () => {
    const [a, b, c] = [bloomSlot(0), bloomSlot(1), bloomSlot(2)];
    expect(b.x).toBeLessThan(a.x);
    expect(c.x).toBeLessThan(b.x);
    expect(b.y).toBeLessThan(a.y);
    expect(c.y).toBeLessThan(b.y);
    expect(a.rotate).toBeLessThan(0);
    expect(b.rotate).toBeLessThan(a.rotate);
    expect(c.rotate).toBeLessThan(b.rotate);
  });

  it("keeps every plate's centre and label on a 390px phone, as drawn", () => {
    /* The image runs Review's rounded end past the screen; its label and the
       whole of Story and Post stay on it. The label spans the middle 60px. */
    const plusX = 390 - BLOOM_PLUS.inset - BLOOM_PLUS.size / 2;
    expect(390 - plusX).toBeCloseTo(30, 0);
    for (let i = 0; i < 3; i += 1) {
      const slot = bloomSlot(i);
      const rad = (Math.abs(slot.rotate) * Math.PI) / 180;
      const labelReach = 30 * Math.cos(rad);
      expect(plusX + slot.x + labelReach).toBeLessThan(390);
      expect(plusX + slot.x - (BLOOM_ITEM.width / 2) * Math.cos(rad)).toBeGreaterThan(8);
    }
  });

  it("sits the nearest plate on the plus's rim, not inside it", () => {
    /* The render seats Review's lower edge on the top of the plus. */
    const nearest = bloomSlot(0);
    expect(nearest.y + BLOOM_ITEM.height / 2).toBeLessThanOrEqual(-BLOOM_PLUS.size / 2 + 2);
  });

  it("draws a trail from each plate's trailing end into the plus", () => {
    for (let i = 0; i < 3; i += 1) {
      const d = bloomTrail(bloomSlot(i));
      const [sx, sy] = d.slice(1).split(" ").map(Number) as [number, number];
      /* It starts left of and below the plate's centre, and ends on the plus. */
      expect(sx).toBeLessThan(bloomSlot(i).x);
      expect(sy).toBeGreaterThan(bloomSlot(i).y);
      expect(d.endsWith(`${(-BLOOM_PLUS.size / 2 + 4).toFixed(1)} 6.0`)).toBe(true);
    }
  });

  it("collapses onto the plus at progress zero", () => {
    expect(bloomTransform(bloomSlot(2), 0)).toBe(
      "translate(0.0px, 0.0px) rotate(0.0deg) scale(0.400)",
    );
  });
});
