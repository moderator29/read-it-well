import { describe, expect, it } from "vitest";
import {
  daysUntil,
  exitAccountOpen,
  relistOpen,
  relistOpensOn,
  renewalCarriesFees,
  renewalTotal,
  rentChange,
} from "./renewal";

const offer = { rentMinor: 320_000_000, serviceMinor: 20_000_000, agencyMinor: 0, legalMinor: 0, agreementMinor: 0 };

describe("renewal clock", () => {
  it("counts whole days to the end", () => {
    expect(daysUntil("2026-12-24", "2026-09-25")).toBe(90);
    expect(daysUntil("2026-09-24", "2026-09-25")).toBe(-1);
  });
  it("opens the relist 90 days out, never over a renewing tenant", () => {
    expect(relistOpensOn("2026-12-24")).toBe("2026-09-25");
    expect(relistOpen("2026-12-24", "2026-09-24", false)).toBe(false);
    expect(relistOpen("2026-12-24", "2026-09-25", false)).toBe(true);
    expect(relistOpen("2026-12-24", "2026-12-01", true)).toBe(false);
  });
  it("opens the exit account 30 days out, and only once the caution is settled", () => {
    expect(exitAccountOpen("2026-12-24", "2026-11-24", true)).toBe(true);
    expect(exitAccountOpen("2026-12-24", "2026-11-23", true)).toBe(false);
    expect(exitAccountOpen("2026-12-24", "2026-12-24", false)).toBe(false);
  });
});

describe("renewal offer", () => {
  it("totals rent and service charge, and flags any fee", () => {
    expect(renewalTotal(offer)).toBe(340_000_000);
    expect(renewalCarriesFees(offer)).toBe(false);
    expect(renewalCarriesFees({ ...offer, agencyMinor: 1 })).toBe(true);
    expect(renewalTotal({ ...offer, serviceMinor: null, legalMinor: 5_000_000 })).toBe(325_000_000);
  });
  it("says how the rent moved against the last let", () => {
    expect(rentChange(300_000_000, offer)).toBe(20_000_000);
    expect(rentChange(null, offer)).toBeNull();
  });
});
