import { describe, expect, it } from "vitest";
import { daysSinceConfirmed, dueForConfirmation } from "./freshness";

const NOW = Date.parse("2026-09-30T12:00:00Z");
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();

describe("the still-available sweep (C5)", () => {
  it("asks about a live listing not confirmed in 14 days, oldest first", () => {
    const rows = [
      { id: "fresh", title: "A", publishedAt: ago(3), listerConfirmedAt: null },
      { id: "old", title: "B", publishedAt: ago(60), listerConfirmedAt: ago(20) },
      { id: "older", title: "C", publishedAt: ago(90), listerConfirmedAt: null },
      { id: "confirmed", title: "D", publishedAt: ago(90), listerConfirmedAt: ago(2) },
    ];
    expect(dueForConfirmation(rows, NOW).map((r) => r.id)).toEqual(["older", "old"]);
  });
  it("counts days since the last statement", () => {
    expect(daysSinceConfirmed({ id: "x", title: "x", publishedAt: ago(30), listerConfirmedAt: ago(16) }, NOW)).toBe(16);
    expect(daysSinceConfirmed({ id: "x", title: "x", publishedAt: null, listerConfirmedAt: null }, NOW)).toBeNull();
  });
});
