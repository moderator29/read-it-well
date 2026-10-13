import { describe, expect, it } from "vitest";
import { planParticles, seeded } from "./particle-delete";

describe("the particle plan", () => {
  it("is deterministic: the same seed gives the same pieces", () => {
    expect(planParticles(320, 64, { seed: 7 })).toEqual(planParticles(320, 64, { seed: 7 }));
    expect(planParticles(320, 64, { seed: 7 })).not.toEqual(planParticles(320, 64, { seed: 8 }));
    const a = seeded(3);
    const b = seeded(3);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("lands near the requested count and covers the whole box", () => {
    const plan = planParticles(300, 100, { count: 36 });
    expect(plan.length).toBeGreaterThan(24);
    expect(plan.length).toBeLessThan(54);
    expect(Math.min(...plan.map((p) => p.x))).toBe(0);
    expect(Math.min(...plan.map((p) => p.y))).toBe(0);
    const reach = Math.max(...plan.map((p) => p.x + p.size));
    expect(reach).toBeGreaterThanOrEqual(300 - 1);
  });

  it("sweeps from the left, drifts up, and stays within the stated timing", () => {
    const plan = planParticles(300, 100);
    const left = plan.filter((p) => p.x === 0);
    const right = plan.filter((p) => p.x > 200);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(left.map((p) => p.delay))).toBeLessThan(mean(right.map((p) => p.delay)));
    for (const p of plan) {
      expect(p.dy).toBeLessThan(0);
      expect(p.duration).toBeGreaterThanOrEqual(420);
      expect(p.duration).toBeLessThanOrEqual(640);
      expect([0, 1, 2]).toContain(p.tone);
    }
  });

  it("copes with a zero-size box without dividing by zero", () => {
    expect(() => planParticles(0, 0)).not.toThrow();
  });
});
