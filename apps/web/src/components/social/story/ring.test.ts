import { describe, expect, it } from "vitest";
import { allSeen, ringGradient, ringSegments, RING_GAP_DEG, RING_MAX_SEGMENTS } from "./ring";

/** The story ring is a status: a segment per live story, quiet once opened (reference 7128). */
describe("the story ring", () => {
  it("draws one segment per story, at most six", () => {
    expect(ringSegments(1)).toBe(1);
    expect(ringSegments(3)).toBe(3);
    expect(ringSegments(40)).toBe(RING_MAX_SEGMENTS);
    expect(ringSegments(0)).toBe(1);
  });

  it("one story is a full circle with no gap", () => {
    const lit = ringGradient([false]);
    expect(lit).not.toContain("transparent");
    expect(lit).toContain("--nf-ring-lit");
    expect(ringGradient([true])).toContain("--nf-ring-seen");
  });

  it("several stories leave a gap between segments, and an opened one goes quiet", () => {
    const g = ringGradient([true, false, false]);
    expect(g.match(/--nf-ring-seen/g)).toHaveLength(1);
    expect(g).toContain("transparent");
    /* Three segments of 120deg each, with RING_GAP_DEG of empty ring between. */
    expect(g).toContain(`${(RING_GAP_DEG / 2).toFixed(2)}deg`);
  });

  it("uses tokens only: no raw colour can reach a stylesheet from here", () => {
    for (const flags of [[false], [true], [false, true, false, true], Array(9).fill(false)]) {
      const g = ringGradient(flags);
      expect(g).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(g).not.toMatch(/\brgba?\(/);
      expect(g).not.toMatch(/\bhsla?\(/);
    }
  });

  it("is all seen only when there is something and all of it is opened", () => {
    expect(allSeen([])).toBe(false);
    expect(allSeen([true, false])).toBe(false);
    expect(allSeen([true, true])).toBe(true);
  });
});
