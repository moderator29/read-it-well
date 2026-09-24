import { describe, expect, it } from "vitest";
import { attributeCaution, leadShare } from "./shares";

describe("flatmates' shares", () => {
  it("leaves the lead the remainder, so the shares sum to the total", () => {
    expect(leadShare(420_000_000, [{ id: "a", shareMinor: 140_000_000 }])).toBe(280_000_000);
  });
  it("attributes the caution pro rata, remainder on the lead", () => {
    const out = attributeCaution(100_001, 300, [
      { id: "a", shareMinor: 100 },
      { id: "b", shareMinor: 100 },
    ]);
    expect(out.byId).toEqual({ a: 33_333, b: 33_333 });
    expect(out.lead).toBe(33_335);
    expect(out.lead + out.byId.a! + out.byId.b!).toBe(100_001);
  });
  it("gives the lead everything when there is no one else, and nothing when there is no caution", () => {
    expect(attributeCaution(56_000_000, 420_000_000, [])).toEqual({ lead: 56_000_000, byId: {} });
    expect(attributeCaution(0, 420_000_000, [{ id: "a", shareMinor: 1 }]).lead).toBe(0);
  });
  it("stays exact on the largest move-ins", () => {
    const out = attributeCaution(500_000_000, 3_630_000_000, [{ id: "a", shareMinor: 1_210_000_000 }]);
    expect(out.byId.a! + out.lead).toBe(500_000_000);
  });
});
