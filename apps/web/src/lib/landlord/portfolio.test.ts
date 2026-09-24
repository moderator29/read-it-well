import { describe, expect, it } from "vitest";
import { groupByPlace, nairaToMinor, readBriefs, readBuildings, readPitches } from "./portfolio";

describe("nairaToMinor", () => {
  it("reads the ways people write rent", () => {
    expect(nairaToMinor("2,500,000")).toBe(250_000_000);
    expect(nairaToMinor("₦2.5m")).toBe(250_000_000);
    expect(nairaToMinor("800k")).toBe(80_000_000);
    expect(nairaToMinor("")).toBeNull();
    expect(nairaToMinor("two million")).toBeNull();
    expect(nairaToMinor("-5")).toBeNull();
  });
});

describe("the portfolio readers", () => {
  it("read units and group them by place, in order", () => {
    const units = readBuildings([
      { listing_id: "a", place_name: "Surulere", bedrooms: 2, let_state: "let", tenancy_ends_on: "2027-01-01", achieved_rent_minor: "250000000", rent_period: "year", other_listers: ["X", null], mandate_holders: [], pitch_count: 0 },
      { listing_id: "b", place_name: "Yaba", let_state: "vacant", invitation_id: "i", invitation_status: "open", pitch_count: 2 },
      { listing_id: "c", place_name: "Surulere", let_state: "weird" },
      { place_name: "no id" },
    ]);
    expect(units).toHaveLength(3);
    expect(units[0]!.achievedRentMinor).toBe(250_000_000);
    expect(units[0]!.otherListers).toEqual(["X"]);
    expect(units[2]!.letState).toBe("vacant");
    expect(groupByPlace(units).map((g) => [g.place, g.units.length])).toEqual([
      ["Surulere", 2],
      ["Yaba", 1],
    ]);
  });

  it("drop a brief or a pitch that is missing what it needs", () => {
    expect(readBriefs([{ invitation_id: "i", asking_min_minor: 1, asking_max_minor: 2, expires_at: "2026-10-01" }, { invitation_id: "j" }])).toHaveLength(1);
    expect(readPitches([{ pitch_id: "p", note: "hello there" }, { pitch_id: "q" }])[0]!.agentName).toBe("A verified agent");
    expect(readBuildings(null)).toEqual([]);
  });
});
