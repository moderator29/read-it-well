import { describe, expect, it } from "vitest";
import { livePayoffFor, liveSeenKey } from "./lister-live";

const NOW = Date.parse("2026-10-06T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const never = () => false;

describe("the lister's live payoff: only what the server says is live, and once", () => {
  it("plays for nothing that is not PUBLISHED, whatever else is true of it", () => {
    for (const status of ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "MORE_INFO_REQUIRED", "REJECTED", "SUSPENDED"]) {
      expect(livePayoffFor([{ id: "a", status, publishedAt: hoursAgo(1) }], NOW, never), status).toBeNull();
    }
  });

  it("plays for a listing published recently, and not for one with no publication time", () => {
    expect(livePayoffFor([{ id: "a", status: "PUBLISHED", publishedAt: hoursAgo(2) }], NOW, never)?.id).toBe("a");
    expect(livePayoffFor([{ id: "a", status: "PUBLISHED", publishedAt: null }], NOW, never)).toBeNull();
    expect(livePayoffFor([{ id: "a", status: "PUBLISHED", publishedAt: "not a date" }], NOW, never)).toBeNull();
  });

  it("is news for a fortnight, and never for a time in the future", () => {
    expect(livePayoffFor([{ id: "a", status: "PUBLISHED", publishedAt: hoursAgo(24 * 15) }], NOW, never)).toBeNull();
    expect(livePayoffFor([{ id: "a", status: "PUBLISHED", publishedAt: hoursAgo(-2) }], NOW, never)).toBeNull();
  });

  it("plays once per device per publication: a seen key stops it, a re-publication is news again", () => {
    const row = { id: "a", status: "PUBLISHED", publishedAt: hoursAgo(1) };
    const seen = new Set([liveSeenKey(row)]);
    expect(livePayoffFor([row], NOW, (k) => seen.has(k))).toBeNull();
    const again = { ...row, publishedAt: hoursAgo(0.5) };
    expect(livePayoffFor([again], NOW, (k) => seen.has(k))?.publishedAt).toBe(again.publishedAt);
  });

  it("names one listing at most, the most recently published", () => {
    const rows = [
      { id: "older", status: "PUBLISHED", publishedAt: hoursAgo(30) },
      { id: "newest", status: "PUBLISHED", publishedAt: hoursAgo(1) },
      { id: "middle", status: "PUBLISHED", publishedAt: hoursAgo(5) },
    ];
    expect(livePayoffFor(rows, NOW, never)?.id).toBe("newest");
  });
});
