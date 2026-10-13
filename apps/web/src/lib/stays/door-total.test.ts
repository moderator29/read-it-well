import { describe, expect, it } from "vitest";
import { allInMinor, doorLines, toDoorCharges } from "./door-total";

/** Every cost before booking: the nights plus each declared door charge, worked out for the stay. */
describe("doorLines and allInMinor", () => {
  const charges = [
    { key: "caution", label: "Caution deposit", minor: 5_000_000, per: "stay" as const, perLabel: "stay" },
    { key: "cleaning", label: "Cleaning", minor: 500_000, per: "night" as const, perLabel: "night" },
    { key: "extra_guest", label: "Extra guest", minor: 1_000_000, per: "guest" as const, perLabel: "guest" },
    { key: "power", label: "Power", minor: 20_000, per: "unit" as const, perLabel: "unit used" },
  ];

  it("works each charge out for three nights and two guests, and never adds one that depends on use", () => {
    const lines = doorLines(charges, 3, 2);
    expect(lines.map((line) => line.forStayMinor)).toEqual([5_000_000, 1_500_000, 2_000_000, null]);
    expect(lines[0]?.refundable).toBe(true);
    expect(allInMinor(30_000_000, lines)).toBe(38_500_000);
  });
});

describe("toDoorCharges", () => {
  const words = {
    keys: { caution: "Caution", power: "Power", cleaning: "Cleaning", extra_guest: "Extra guest", visitor: "Visitor" },
    units: { stay: "stay", night: "night", guest: "guest", unit: "unit used" },
  };

  it("names each declared charge in key order and leaves the none answers out", () => {
    const out = toDoorCharges(
      {
        caution: { none: true },
        power: { minor: 20_000, per: "unit" },
        cleaning: { minor: 500_000, per: "night" },
        extra_guest: { none: true },
        visitor: { minor: 100_000, per: "guest" },
      },
      words,
    );
    expect(out).toEqual([
      { key: "power", label: "Power", minor: 20_000, per: "unit", perLabel: "unit used" },
      { key: "cleaning", label: "Cleaning", minor: 500_000, per: "night", perLabel: "night" },
      { key: "visitor", label: "Visitor", minor: 100_000, per: "guest", perLabel: "guest" },
    ]);
  });

  it("gives nothing for a missing or failed declaration", () => {
    expect(toDoorCharges(null, words)).toEqual([]);
    expect(toDoorCharges(undefined, words)).toEqual([]);
  });
});
