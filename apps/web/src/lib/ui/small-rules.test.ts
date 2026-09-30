import { describe, expect, it } from "vitest";
import { counterFor, PULL_MAX_PX, pullDistance, shouldOfferTop } from "./small-rules";

describe("back to top", () => {
  const base = { viewport: 800, pageHeight: 6000 };
  it("offers the way up on a long page, well down it, scrolling up", () => {
    expect(shouldOfferTop({ ...base, scrollY: 2400, scrollingUp: true })).toBe(true);
  });
  it("stays away while reading on, near the top, or on a short page", () => {
    expect(shouldOfferTop({ ...base, scrollY: 2400, scrollingUp: false })).toBe(false);
    expect(shouldOfferTop({ ...base, scrollY: 1200, scrollingUp: true })).toBe(false);
    expect(shouldOfferTop({ viewport: 800, pageHeight: 2400, scrollY: 1700, scrollingUp: true })).toBe(false);
  });
});

describe("pull to refresh", () => {
  it("halves the finger's travel and stops at the ceiling", () => {
    expect(pullDistance(-20)).toBe(0);
    expect(pullDistance(100)).toBe(50);
    expect(pullDistance(1000)).toBe(PULL_MAX_PX);
  });
});

describe("field counter", () => {
  it("stays quiet until the last fifth, then counts, and marks the limit", () => {
    expect(counterFor(100, 140)).toEqual({ show: false, over: false });
    expect(counterFor(112, 140)).toEqual({ show: true, over: false });
    expect(counterFor(140, 140)).toEqual({ show: true, over: true });
  });
  it("uses the last 10 on a short limit, and nothing without one", () => {
    expect(counterFor(19, 30)).toEqual({ show: false, over: false });
    expect(counterFor(20, 30)).toEqual({ show: true, over: false });
    expect(counterFor(5, undefined)).toEqual({ show: false, over: false });
  });
});
