import { describe, expect, it } from "vitest";
import { earnedTrust, withEarnedTrust } from "./earned-trust";

/*
 * D24: an example row may look like a listing, never like a CHECKED one. These
 * hold the presentation-side lock: whatever the row carries, an example draws
 * no badge, no inspection or address date and no rating; a real row draws
 * exactly what it earned, and a null stays a null.
 */
const real = {
  isDemo: false,
  verified: true,
  inspectedAt: "2026-09-12T10:00:00Z",
  addressVerifiedAt: "2026-08-03T09:00:00Z",
  rating: 4.6,
  reviewCount: 9,
};

describe("earnedTrust", () => {
  it("draws nothing an example row did not earn, whatever the row carries", () => {
    expect(earnedTrust({ ...real, isDemo: true })).toEqual({
      verified: false,
      inspectedAt: null,
      addressCheckedAt: null,
      rating: 0,
      reviewCount: 0,
    });
  });

  it("draws exactly what a real row earned, dates as dates", () => {
    expect(earnedTrust(real)).toEqual({
      verified: true,
      inspectedAt: real.inspectedAt,
      addressCheckedAt: real.addressVerifiedAt,
      rating: 4.6,
      reviewCount: 9,
    });
  });

  it("keeps an absent or unreadable date absent, never a placeholder", () => {
    const out = earnedTrust({ ...real, inspectedAt: undefined, addressVerifiedAt: "not a date" });
    expect(out.inspectedAt).toBeNull();
    expect(out.addressCheckedAt).toBeNull();
  });

  it("drops a rating with no reviews behind it", () => {
    expect(earnedTrust({ ...real, reviewCount: 0 }).rating).toBe(0);
  });
});

describe("withEarnedTrust", () => {
  it("rewrites the trust fields on an example and leaves everything else", () => {
    const row = { ...real, isDemo: true, title: "A flat" };
    const out = withEarnedTrust(row);
    expect(out.title).toBe("A flat");
    expect(out.verified).toBe(false);
    expect(out.rating).toBe(0);
    expect(out.reviewCount).toBe(0);
    expect("inspectedAt" in out).toBe(false);
    expect("addressVerifiedAt" in out).toBe(false);
  });
});
