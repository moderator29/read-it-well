import { describe, expect, it } from "vitest";
import {
  addMonths,
  bookedFloor,
  cellFor,
  cleanSelection,
  heldWords,
  describeSelection,
  isIsoDate,
  lagosToday,
  lastOfMonth,
  monthGrid,
  nairaToMinor,
  openingMonth,
  parseMonth,
  presetNights,
  primaryPlan,
  rangeInclusive,
  rowKey,
  runsOf,
  toneOf,
  weekdayMon0,
  type CalendarRoom,
  type CalendarRows,
} from "./rate-calendar";

const room: CalendarRoom = {
  id: "rt1",
  name: "Deluxe double",
  unitsTotal: 3,
  status: "PUBLISHED",
  plans: [
    { id: "old", name: "Old", rateMinor: 1_000_00, active: false },
    { id: "rp1", name: "Room only", rateMinor: 45_000_00, active: true },
  ],
};

function rows(partial: Partial<CalendarRows> = {}): CalendarRows {
  return { rates: new Map(), inventory: new Map(), imported: new Map(), ...partial };
}

describe("dates", () => {
  it("validates real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
  });

  it("walks months across a year end", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(lastOfMonth("2028-02")).toBe("2028-02-29");
    expect(parseMonth("2026-10-14")).toBe("2026-10");
    expect(parseMonth("2026-13")).toBeNull();
  });

  it("lays a month out in whole Monday-first weeks", () => {
    const grid = monthGrid("2026-10");
    // 1 October 2026 is a Thursday.
    expect(weekdayMon0("2026-10-01")).toBe(3);
    expect(grid[0]?.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });

  it("reads Lagos's day, not UTC's, just before midnight UTC", () => {
    expect(lagosToday(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
  });

  it("ranges either way round", () => {
    expect(rangeInclusive("2026-10-03", "2026-10-01")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
  });
});

describe("presets and selection", () => {
  it("weekends are Friday and Saturday nights, from today on", () => {
    const nights = presetNights("2026-10", "weekends", "2026-10-10");
    // 10 October 2026 is a Saturday: today's own night still counts.
    expect(nights.slice(0, 3)).toEqual(["2026-10-10", "2026-10-16", "2026-10-17"]);
    expect(nights.every((d) => [4, 5].includes(weekdayMon0(d)))).toBe(true);
    expect(nights).not.toContain("2026-10-09");
  });

  it("every night of December", () => {
    expect(presetNights("2026-12", "month", "2026-09-30")).toHaveLength(31);
  });

  it("cleans a selection: unique, sorted, valid, not past", () => {
    expect(cleanSelection(["2026-10-05", "2026-10-01", "x", "2026-10-05", "2026-09-01"], "2026-09-30")).toEqual([
      "2026-10-01",
      "2026-10-05",
    ]);
  });

  it("names runs of nights in words", () => {
    expect(runsOf(["2026-12-03", "2026-12-04", "2026-12-05", "2026-12-12"])).toEqual([
      { from: "2026-12-03", to: "2026-12-05" },
      { from: "2026-12-12", to: "2026-12-12" },
    ]);
    expect(describeSelection(["2026-12-03", "2026-12-04", "2026-12-05", "2026-12-12"])).toBe("3 Dec to 5 Dec, 12 Dec");
  });
});

describe("cells", () => {
  it("prices a night the way the database does: override, else the plan's rate", () => {
    const plan = primaryPlan(room);
    expect(plan?.id).toBe("rp1");
    const r = rows({ rates: new Map([[rowKey("rp1", "2026-12-24"), { rateMinor: 80_000_00, closed: false }]]) });
    const override = cellFor(room, plan, "2026-12-24", r, "2026-09-30");
    const plain = cellFor(room, plan, "2026-12-23", r, "2026-09-30");
    expect(override.priceMinor).toBe(80_000_00);
    expect(plain.priceMinor).toBe(45_000_00);
    expect(toneOf(plain)).toBe("none");
  });

  it("tells closed, full, imported and past nights apart", () => {
    const plan = primaryPlan(room);
    const r = rows({
      rates: new Map([[rowKey("rp1", "2026-10-02"), { rateMinor: null, closed: true }]]),
      inventory: new Map([
        [rowKey("rt1", "2026-10-02"), { unitsOpen: 3, unitsBooked: 0 }],
        [rowKey("rt1", "2026-10-03"), { unitsOpen: 2, unitsBooked: 2 }],
        [rowKey("rt1", "2026-10-04"), { unitsOpen: 0, unitsBooked: 0 }],
        [rowKey("rt1", "2026-10-05"), { unitsOpen: 3, unitsBooked: 1 }],
        [rowKey("rt1", "2026-10-06"), { unitsOpen: 0, unitsBooked: 0 }],
        [rowKey("rt1", "2026-10-07"), { unitsOpen: 2, unitsBooked: 0 }],
      ]),
      imported: new Map([
        [rowKey("rt1", "2026-10-06"), "Airbnb"],
        [rowKey("rt1", "2026-10-07"), "Airbnb"],
      ]),
    });
    const at = (d: string) => toneOf(cellFor(room, plan, d, r, "2026-10-01"));
    expect(at("2026-09-30")).toBe("past");
    expect(at("2026-10-02")).toBe("closed");
    expect(at("2026-10-03")).toBe("full");
    expect(at("2026-10-04")).toBe("closed");
    expect(at("2026-10-05")).toBe("open");
    expect(at("2026-10-06")).toBe("imported");
    // Airbnb holds one of three rooms: two are still for sale here.
    expect(at("2026-10-07")).toBe("open");
  });

  it("the booked floor is the busiest night's holds", () => {
    const plan = primaryPlan(room);
    const r = rows({
      inventory: new Map([
        [rowKey("rt1", "2026-10-02"), { unitsOpen: 3, unitsBooked: 1 }],
        [rowKey("rt1", "2026-10-03"), { unitsOpen: 3, unitsBooked: 2 }],
      ]),
    });
    const cells = ["2026-10-02", "2026-10-03"].map((d) => cellFor(room, plan, d, r, "2026-10-01"));
    expect(bookedFloor(cells)).toBe(2);
  });
});

describe("naira typed by a person", () => {
  it("reads the ways people write it", () => {
    expect(nairaToMinor("45,000")).toBe(4_500_000);
    expect(nairaToMinor("₦45000.5")).toBe(4_500_050);
    expect(nairaToMinor("N 1,200")).toBe(120_000);
    expect(nairaToMinor("forty")).toBeNull();
    expect(nairaToMinor("-5")).toBeNull();
  });
});

describe("rooms another site holds (C2b)", () => {
  it("says how many and by whom, and nothing when none", () => {
    expect(heldWords({ held: 1, imported: "Airbnb" })).toBe("1 held by Airbnb");
    expect(heldWords({ held: 2, imported: "Airbnb, Booking.com" })).toBe("2 held by Airbnb, Booking.com");
    expect(heldWords({ held: 0, imported: null })).toBeNull();
  });

  it("counts one room per linked calendar when the read gives no count", () => {
    const plan = primaryPlan(room);
    const r = rows({ imported: new Map([[rowKey("rt1", "2026-10-09"), "Airbnb"]]) });
    expect(cellFor(room, plan, "2026-10-09", r, "2026-10-01").held).toBe(1);
    const counted = rows({ imported: new Map([[rowKey("rt1", "2026-10-09"), "Airbnb, Booking.com"]]), held: new Map([[rowKey("rt1", "2026-10-09"), 2]]) });
    expect(cellFor(room, plan, "2026-10-09", counted, "2026-10-01").held).toBe(2);
  });
});

describe("the month the calendar opens on", () => {
  it("opens on this month while it has nights left to sell", () => {
    expect(openingMonth("2026-09-01")).toBe("2026-09");
    expect(openingMonth("2026-09-28")).toBe("2026-09");
  });
  it("opens on the next month on a month's last two days, across a year too", () => {
    expect(openingMonth("2026-09-29")).toBe("2026-10");
    expect(openingMonth("2026-09-30")).toBe("2026-10");
    expect(openingMonth("2026-12-31")).toBe("2027-01");
    expect(openingMonth("2028-02-29")).toBe("2028-03");
  });
});
