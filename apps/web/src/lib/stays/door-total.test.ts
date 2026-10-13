import { describe, expect, it } from "vitest";
import { allInMinor, doorLines } from "./door-total";

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
