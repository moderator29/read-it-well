import { describe, expect, it } from "vitest";

import {
  HOUSE_RULES,
  PLACE_TYPES,
  PRICE_BANDS,
  SITTING_DURATIONS,
  TABLE_SIZES,
  WEEK_FROM_MONDAY,
  SHORTLET_BED_KIND,
  bedsArray,
  bedsTotal,
  branchFor,
  clockLabel,
  closingTimes,
  coversFrom,
  halfHours,
  houseRulesOn,
  houseRulesText,
  mergeHouseRules,
  mealPlanLabel,
  noticeLabel,
  placeTypeFrom,
  placeTypeUnavailable,
  windowLabel,
} from "./stays-setup";

describe("branchFor", () => {
  it("sends a shortlet operator to GOVERNING-11 and a hotel to GOVERNING-10", () => {
    expect(branchFor("shortlet_operator")).toBe("shortlet");
    expect(branchFor("hotel")).toBe("hotel");
    expect(branchFor("restaurant")).toBe("restaurant");
  });

  it("treats a guest house and a serviced block as hotels, because they are run like one", () => {
    expect(branchFor("guest_house")).toBe("hotel");
    expect(branchFor("serviced_apartments")).toBe("hotel");
    expect(branchFor("resort")).toBe("hotel");
  });

  it("defaults to the hotel's fuller flow when nothing has been chosen", () => {
    expect(branchFor(null)).toBe("hotel");
  });
});

describe("the place types", () => {
  it("offers exactly the three the render draws", () => {
    expect(PLACE_TYPES.map((type) => type.id)).toEqual([
      "entire_flat",
      "whole_house",
      "private_room",
    ]);
  });

  it("refuses anything that is not one of them", () => {
    expect(placeTypeFrom("entire_flat")?.title).toBe("Entire flat");
    expect(placeTypeFrom("double")).toBeNull();
    expect(placeTypeFrom("")).toBeNull();
    expect(placeTypeFrom(null)).toBeNull();
  });

  it("recognises only Postgres's own unknown-enum code as the missing migration", () => {
    /* 22P02 is "invalid input value for enum". 42501 is a refused write and
       23505 is a duplicate; neither may be reported as a missing migration,
       because that would send somebody to run a file that changes nothing. */
    expect(placeTypeUnavailable("22P02")).toBe(true);
    expect(placeTypeUnavailable("42501")).toBe(false);
    expect(placeTypeUnavailable("23505")).toBe(false);
    expect(placeTypeUnavailable(null)).toBe(false);
    expect(placeTypeUnavailable(undefined)).toBe(false);
  });
});

describe("what is slept in", () => {
  /*
   * THESE TESTS EXIST BECAUSE OF A SHIPPED FAULT. The shortlet screen wrote
   * `{bedrooms, beds}`, an object, into a column carrying
   * `room_types_beds_check (jsonb_typeof(beds) = 'array')`, and every real
   * save would have failed with 23514. Nothing in this file could have caught
   * it, because nothing in this file knew the column's shape.
   */
  it("writes an ARRAY, which is the only shape the column takes", () => {
    const written = bedsArray(3);
    expect(Array.isArray(written)).toBe(true);
    expect(written).toEqual([{ kind: SHORTLET_BED_KIND, count: 3 }]);
  });

  it("claims no bed kind, because the screen never asks for one", () => {
    /* `unspecified` is the absence of a fact, named. Writing "double" because
       most beds are double would be a claim about somebody's flat that nobody
       made. */
    expect(SHORTLET_BED_KIND).toBe("unspecified");
    expect(bedsArray(1)[0]?.kind).toBe("unspecified");
  });

  it("writes an empty array for none rather than a zero entry", () => {
    expect(bedsArray(0)).toEqual([]);
    expect(bedsArray(-2)).toEqual([]);
  });

  it("adds up what a saved row records, across however many kinds", () => {
    expect(bedsTotal([{ kind: "double", count: 1 }, { kind: "single", count: 2 }])).toBe(3);
    expect(bedsTotal(bedsArray(4))).toBe(4);
  });

  it("reads a malformed row as none rather than throwing on it", () => {
    /* The ARRAY is constrained and its CONTENTS are not: the schema says the
       entries are "validated in the app" and no schema in this repository
       validates them. A row written by a seed or by hand must not take down
       the step that would let somebody fix it. */
    expect(bedsTotal(null)).toBe(0);
    expect(bedsTotal({ bedrooms: 2, beds: 3 })).toBe(0);
    expect(bedsTotal([{ kind: "double" }])).toBe(0);
    expect(bedsTotal([null, 7, "two", { count: "3" }])).toBe(0);
    expect(bedsTotal([{ kind: "double", count: -1 }, { kind: "single", count: 2 }])).toBe(2);
  });
});

describe("the house rules", () => {
  it("writes one line per rule it is given, in the drawn order", () => {
    expect(houseRulesText(["no_pets", "no_smoking"]).split("\n")).toEqual([
      "No smoking anywhere inside the property.",
      "No pets.",
    ]);
  });

  it("reads back only the lines it wrote itself", () => {
    const text = "No pets.\nThe generator runs from 7pm.";
    expect(houseRulesOn(text)).toEqual(["no_pets"]);
  });

  it("KEEPS WHAT THE HOST TYPED when a switch is turned off", () => {
    /* The failure this exists to prevent: a host wrote their own rule on the
       old textarea step, toggled No pets off here, and lost the generator. */
    const existing = "No pets.\nThe generator runs from 7pm.";
    const merged = mergeHouseRules(existing, ["no_smoking"]);
    expect(merged.split("\n")).toEqual([
      "No smoking anywhere inside the property.",
      "The generator runs from 7pm.",
    ]);
  });

  it("does not duplicate a line that is toggled on twice", () => {
    const once = mergeHouseRules("", ["no_pets"]);
    expect(mergeHouseRules(once, ["no_pets"])).toBe(once);
  });

  it("leaves nothing behind when every rule is off and nothing was typed", () => {
    expect(mergeHouseRules("", [])).toBe("");
  });

  it("draws the last rule off, as the render draws it", () => {
    const off = HOUSE_RULES.filter((rule) => !rule.onByDefault).map((rule) => rule.id);
    expect(off).toEqual(["no_children"]);
  });
});

describe("the clock", () => {
  it("prints a 24 hour column value the way the render prints it", () => {
    expect(clockLabel("08:00")).toBe("8:00 AM");
    expect(clockLabel("14:00")).toBe("2:00 PM");
    expect(clockLabel("23:00")).toBe("11:00 PM");
  });

  it("gets both ends of the day right, which is where a 12 hour clock breaks", () => {
    expect(clockLabel("00:00")).toBe("12:00 AM");
    expect(clockLabel("12:00")).toBe("12:00 PM");
    expect(clockLabel("12:30")).toBe("12:30 PM");
  });

  it("hands anything malformed straight back rather than inventing a time", () => {
    expect(clockLabel("nonsense")).toBe("nonsense");
    expect(clockLabel("")).toBe("");
  });

  it("writes a window with a word rather than a dash", () => {
    expect(windowLabel("08:00", "23:00")).toBe("8:00 AM to 11:00 PM");
  });

  it("offers every half hour of the day and no more", () => {
    const times = halfHours();
    expect(times).toHaveLength(48);
    expect(times[0]).toBe("00:00");
    expect(times.at(-1)).toBe("23:30");
  });

  it("adds 11:59 PM as a closing time, because a service stays inside one day", () => {
    /* `service_windows_order_chk` is `opens < closes`, and midnight is the
       next day. The render draws a 12:00 AM close that this column refuses,
       so the last minute of the day is offered instead of a control that
       would fail on save. */
    const closes = closingTimes();
    expect(closes).toHaveLength(49);
    expect(closes.at(-1)).toBe("23:59");
    expect(clockLabel("23:59")).toBe("11:59 PM");
  });
});

describe("the cancellation notice", () => {
  it("says days when the hours divide into days, as the render writes it", () => {
    expect(noticeLabel(48)).toBe("2 days");
    expect(noticeLabel(168)).toBe("7 days");
    expect(noticeLabel(24)).toBe("1 day");
  });

  it("leaves an odd number of hours as hours rather than inventing half a day", () => {
    expect(noticeLabel(36)).toBe("36 hours");
    expect(noticeLabel(1)).toBe("1 hour");
  });

  it("does not call none of it a day", () => {
    expect(noticeLabel(0)).toBe("0 hours");
  });
});

describe("the tables", () => {
  it("adds the seats up the way a restaurateur counts a room", () => {
    expect(coversFrom({ 2: 5, 4: 8, 6: 4, 8: 3 })).toBe(10 + 32 + 24 + 24);
  });

  it("counts an empty room as none rather than as undefined", () => {
    expect(coversFrom({})).toBe(0);
  });

  it("ignores a size the panel does not offer, because nothing can enter one", () => {
    expect(coversFrom({ 2: 1, 5: 100 })).toBe(2);
  });

  it("offers the four sizes the render draws", () => {
    expect(TABLE_SIZES.map((size) => size.seats)).toEqual([2, 4, 6, 8]);
  });
});

describe("the week", () => {
  it("lists Monday first, as drawn, while keeping the column's own numbering", () => {
    expect(WEEK_FROM_MONDAY.map((day) => day.label)[0]).toBe("Monday");
    expect(WEEK_FROM_MONDAY.map((day) => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe("the vocabulary the render prints", () => {
  it("calls the breakfast plan what the render calls it", () => {
    expect(mealPlanLabel("room_only")).toBe("Room only");
    expect(mealPlanLabel("breakfast")).toBe("Bed and breakfast");
  });

  it("hands back an unknown plan rather than guessing at a label", () => {
    expect(mealPlanLabel("brunch")).toBe("brunch");
  });

  it("prints a band as naira marks and never as an amount", () => {
    expect(PRICE_BANDS.map((band) => band.marks)).toEqual([
      "₦",
      "₦₦",
      "₦₦₦",
      "₦₦₦₦",
    ]);
    for (const band of PRICE_BANDS) {
      expect(band.meaning).not.toMatch(/\d/);
    }
  });

  it("keeps the sitting durations as minutes, so they can be added to a time", () => {
    for (const option of SITTING_DURATIONS) {
      expect(Number.isInteger(option.minutes)).toBe(true);
    }
  });
});
