import { describe, expect, it } from "vitest";
import { declaredCharges, readArrivalCharges, unanswered } from "./arrival-charges";

const full = {
  caution: { minor: 10_000_000, per: "stay" },
  power: { minor: 50_000, per: "unit" },
  cleaning: { none: true },
  extra_guest: { none: true },
  visitor: { none: true },
};

describe("arrival charges", () => {
  it("reads a complete declaration and refuses anything else", () => {
    expect(readArrivalCharges(full)).not.toBeNull();
    expect(readArrivalCharges({ ...full, security: { none: true } })).toBeNull();
    expect(readArrivalCharges({ ...full, cleaning: { minor: 0, per: "stay" } })).toBeNull();
    expect(readArrivalCharges({ ...full, cleaning: { minor: 1.5, per: "stay" } })).toBeNull();
    expect(readArrivalCharges({ ...full, cleaning: { minor: 100, per: "week" } })).toBeNull();
    const { visitor: _dropped, ...partial } = full;
    expect(readArrivalCharges(partial)).toBeNull();
  });
  it("names the keys still to answer", () => {
    expect(unanswered({ caution: { none: true }, power: null })).toEqual(["power", "cleaning", "extra_guest", "visitor"]);
  });
  it("lists only the charges that are owed, in order", () => {
    expect(declaredCharges(readArrivalCharges(full)!)).toEqual([
      { key: "caution", minor: 10_000_000, per: "stay" },
      { key: "power", minor: 50_000, per: "unit" },
    ]);
  });
});
