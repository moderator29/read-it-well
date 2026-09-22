import { describe, expect, it } from "vitest";

import {
  INVENTORY_HORIZON_NIGHTS,
  MAX_NIGHTS_IN_ONE_ACT,
  isoDate,
  nightsBetween,
  nightsToOpen,
} from "./inventory";

/**
 * THE ROWS WITHOUT WHICH A HOTEL CANNOT BE FOUND.
 *
 * `stays_search` treats a night with no `room_inventory` row as NOT OFFERED,
 * deliberately, so a published hotel with no rows is invisible to every dated
 * search. `room_inventory` has existed since M5 and nothing in the application
 * ever wrote to it. These are the rules of the writing, in the form a machine
 * can check.
 *
 * The date arithmetic is the part that bites. `room_inventory.date` is a
 * `date`, and a Date built at local midnight in Lagos, which is UTC+1, renders
 * as the PREVIOUS day in ISO. That is the commonest way a calendar quietly
 * loses its first night, so every case here is stated in UTC and asserted on
 * the string that actually reaches the column.
 */

describe("nightsToOpen", () => {
  const from = new Date("2026-09-22T00:00:00Z");

  it("opens the horizon from the day given, inclusive", () => {
    const nights = nightsToOpen("r1", 4, from);
    expect(nights).toHaveLength(INVENTORY_HORIZON_NIGHTS);
    expect(nights[0]).toEqual({ room_type_id: "r1", date: "2026-09-22", units_open: 4 });
  });

  it("opens exactly what the host declared and never more", () => {
    /* `units_open` is the host's own `units_total`. The platform never decides
       how many rooms a hotel has; it writes down the number they gave. */
    expect(nightsToOpen("r1", 20, from, 3).every((night) => night.units_open === 20)).toBe(true);
  });

  it("crosses a month end and a year end without losing a night", () => {
    const across = nightsToOpen("r1", 1, new Date("2026-12-30T00:00:00Z"), 4);
    expect(across.map((night) => night.date)).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });

  it("counts the leap day rather than skipping it", () => {
    const leap = nightsToOpen("r1", 1, new Date("2028-02-28T00:00:00Z"), 3);
    expect(leap.map((night) => night.date)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });

  it("writes nothing for a room type that offers nothing", () => {
    /* A row saying none are open is a blackout the host did not ask for. No
       rows at all is silence, and silence is the honest state of a room type
       with no units. */
    expect(nightsToOpen("r1", 0, from)).toEqual([]);
  });

  it("uses the UTC day, so a late evening in Lagos does not open yesterday", () => {
    expect(isoDate(new Date("2026-09-22T23:30:00Z"))).toBe("2026-09-22");
  });
});

describe("nightsBetween", () => {
  it("includes both ends, because a host naming one night means that night", () => {
    expect(nightsBetween("2026-09-22", "2026-09-22")).toEqual(["2026-09-22"]);
    expect(nightsBetween("2026-09-22", "2026-09-24")).toEqual([
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
    ]);
  });

  it("refuses a range that runs backwards rather than guessing at it", () => {
    expect(nightsBetween("2026-09-24", "2026-09-22")).toEqual([]);
  });

  it("refuses a date it cannot read", () => {
    expect(nightsBetween("next Tuesday", "2026-09-24")).toEqual([]);
  });

  it("stays under the one-act ceiling for a year, which the action enforces", () => {
    expect(INVENTORY_HORIZON_NIGHTS).toBeLessThanOrEqual(MAX_NIGHTS_IN_ONE_ACT);
  });
});
