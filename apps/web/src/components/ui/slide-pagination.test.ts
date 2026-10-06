import { describe, expect, it } from "vitest";
import { paginationRange } from "./slide-pagination";

describe("paginationRange", () => {
  it("lists every page when they all fit", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("is empty for no pages and clamps a stray current page", () => {
    expect(paginationRange(1, 0)).toEqual([]);
    expect(paginationRange(99, 3)).toEqual([1, 2, 3]);
    expect(paginationRange(-4, 3)).toEqual([1, 2, 3]);
  });

  it("collapses the far end when near the start", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, "end-gap", 20]);
    expect(paginationRange(3, 20)).toEqual([1, 2, 3, 4, 5, "end-gap", 20]);
  });

  it("collapses the near end when near the finish", () => {
    expect(paginationRange(20, 20)).toEqual([1, "start-gap", 16, 17, 18, 19, 20]);
    expect(paginationRange(18, 20)).toEqual([1, "start-gap", 16, 17, 18, 19, 20]);
  });

  it("collapses both ends in the middle and keeps the slot count stable", () => {
    expect(paginationRange(10, 20)).toEqual([1, "start-gap", 9, 10, 11, "end-gap", 20]);
    for (let p = 1; p <= 20; p += 1) expect(paginationRange(p, 20)).toHaveLength(7);
  });

  it("always contains the current page and both ends", () => {
    for (let p = 1; p <= 40; p += 1) {
      const slots = paginationRange(p, 40, 2);
      expect(slots).toContain(p);
      expect(slots[0]).toBe(1);
      expect(slots[slots.length - 1]).toBe(40);
    }
  });
});
