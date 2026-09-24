import { describe, expect, it } from "vitest";
import { addBytes, lagosDay, megabytes, readDays, weekBytes } from "./data-meter";

const NOON = Date.parse("2026-09-24T11:00:00Z");

describe("the data meter (V-79)", () => {
  it("files bytes under the Lagos day", () => {
    /* 23:30Z on the 23rd is 00:30 on the 24th in Lagos. */
    expect(lagosDay(Date.parse("2026-09-23T23:30:00Z"))).toBe("2026-09-24");
  });
  it("adds to today and forgets days older than eight", () => {
    const days = addBytes({ "2026-09-01": 5, "2026-09-24": 100 }, 50, NOON);
    expect(days).toEqual({ "2026-09-24": 150 });
  });
  it("sums the last seven days only", () => {
    const days = { "2026-09-24": 1_000_000, "2026-09-18": 2_000_000, "2026-09-17": 9_000_000 };
    expect(weekBytes(days, NOON)).toBe(3_000_000);
  });
  it("reads megabytes the way a person does, never naira", () => {
    expect(megabytes(1_234_567)).toBe("1.2");
    expect(megabytes(18_400_000)).toBe("18");
  });
  it("survives a corrupted store", () => {
    expect(readDays("{nope")).toEqual({});
    expect(readDays(JSON.stringify({ "2026-09-24": "lots", bad: 3 }))).toEqual({});
  });
});
