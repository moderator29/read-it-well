import { describe, expect, it } from "vitest";
import { escrowHoldsTakenMoney } from "./money-taken";

describe("escrowHoldsTakenMoney (ESC-01)", () => {
  it("does not count a dispute on a proposal nobody funded", () => {
    expect(escrowHoldsTakenMoney({ state: "DISPUTED", funded_at: null })).toBe(false);
  });

  it("counts a dispute on money that was taken", () => {
    expect(escrowHoldsTakenMoney({ state: "DISPUTED", funded_at: "2026-09-23T10:00:00Z" })).toBe(true);
  });

  it("counts the live held states and nothing settled or unfunded", () => {
    expect(escrowHoldsTakenMoney({ state: "HELD", funded_at: "2026-09-23T10:00:00Z" })).toBe(true);
    expect(escrowHoldsTakenMoney({ state: "RELEASE_REQUESTED", funded_at: "x" })).toBe(true);
    expect(escrowHoldsTakenMoney({ state: "INITIATED", funded_at: null })).toBe(false);
    expect(escrowHoldsTakenMoney({ state: "RELEASED", funded_at: "x" })).toBe(false);
    expect(escrowHoldsTakenMoney({ state: "RESOLVED", funded_at: "x" })).toBe(false);
  });
});
