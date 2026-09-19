import { describe, expect, it } from "vitest";
import {
  BLOOM_ITEM,
  BLOOM_SPRING,
  bloomSlot,
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
  it("fans up and to the left, further out for each lozenge", () => {
    const [a, b, c] = [bloomSlot(0), bloomSlot(1), bloomSlot(2)];
    expect(a.x).toBeLessThan(0);
    expect(a.y).toBeLessThan(0);
    expect(b.x).toBeLessThan(a.x);
    expect(c.x).toBeLessThan(b.x);
    expect(b.y).toBeLessThan(a.y);
    expect(c.y).toBeLessThan(b.y);
    /* Each tilts a little more than the one before, never the other way. */
    expect(a.rotate).toBeLessThan(0);
    expect(b.rotate).toBeLessThan(a.rotate);
    expect(c.rotate).toBeLessThan(b.rotate);
  });

  it("fits inside a 390px phone with the plus at the corner", () => {
    /* The plus centre sits 46px in from the right edge (a 1rem inset and a
       60px circle), so both edges of every slot must stay on the screen even
       at the spring's overshoot. */
    const plusX = 390 - 46;
    const half = BLOOM_ITEM.width / 2;
    for (let i = 0; i < 3; i += 1) {
      const slot = bloomSlot(i);
      expect(plusX + slot.x * 1.08 - half).toBeGreaterThan(8);
      expect(plusX + slot.x + half).toBeLessThan(390 - 2);
    }
  });

  it("clears the plus itself, nearest lozenge first", () => {
    /* The plus is a 60px circle; the nearest lozenge must sit above its rim
       rather than on it, or the fan reads as a stack. */
    const nearest = bloomSlot(0);
    expect(nearest.y + BLOOM_ITEM.height / 2).toBeLessThan(-30);
  });

  it("collapses onto the plus at progress zero", () => {
    expect(bloomTransform(bloomSlot(2), 0)).toBe(
      "translate(0.0px, 0.0px) rotate(0.0deg) scale(0.400)",
    );
  });
});
