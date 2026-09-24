import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  NG_PUBLIC_HOLIDAYS,
  businessDaysAfter,
  isBusinessDay,
  lagosDay,
  refundClock,
  refundDueBy,
} from "./business-days";

describe("the Nigerian business day", () => {
  it("skips weekends", () => {
    expect(isBusinessDay("2026-10-03")).toBe(false);
    expect(isBusinessDay("2026-10-04")).toBe(false);
    expect(isBusinessDay("2026-10-05")).toBe(true);
  });

  it("skips a listed public holiday", () => {
    expect(isBusinessDay("2026-10-01")).toBe(false);
  });

  it("lists every holiday on a weekday, because a weekend holiday is observed on a weekday", () => {
    for (const holiday of NG_PUBLIC_HOLIDAYS) {
      const weekday = new Date(`${holiday.day}T00:00:00Z`).getUTCDay();
      expect(weekday, holiday.day).toBeGreaterThan(0);
      expect(weekday, holiday.day).toBeLessThan(6);
    }
  });

  it("reads the Lagos date, not the UTC one", () => {
    expect(lagosDay(new Date("2026-10-06T23:30:00Z"))).toBe("2026-10-07");
  });
});

describe("the refund due-by", () => {
  it("never counts the day of the decision", () => {
    // Decided Tue 6 Oct: Wed, Thu, Fri, Mon, Tue -> Tue 13 Oct.
    expect(businessDaysAfter(new Date("2026-10-06T09:00:00Z"), 5)).toBe("2026-10-13");
  });

  it("steps over Independence Day and the weekend", () => {
    // Decided Tue 29 Sep: Wed 30, (Thu 1 Oct holiday), Fri 2, Mon 5, Tue 6, Wed 7.
    expect(businessDaysAfter(new Date("2026-09-29T09:00:00Z"), 5)).toBe("2026-10-07");
  });

  it("steps over Christmas and Boxing Day observed", () => {
    // Decided Wed 23 Dec: Thu 24, (Fri 25), (Mon 28), Tue 29, Wed 30, Thu 31, (Fri 1 Jan), Mon 4 Jan.
    expect(businessDaysAfter(new Date("2026-12-23T12:00:00Z"), 5)).toBe("2027-01-04");
  });

  it("is the last second of that Lagos day", () => {
    expect(refundDueBy(new Date("2026-10-06T09:00:00Z")).toISOString()).toBe("2026-10-13T22:59:59.000Z");
  });
});

describe("the refund clock", () => {
  const dueBy = new Date("2026-10-13T22:59:59Z");
  it("has no clock when nothing was owed", () => {
    expect(refundClock({ refundMinor: 0, dueBy, landedAt: null }).state).toBe("nothing_owed");
  });
  it("says landed, and on time, when the credit beat the due-by", () => {
    const clock = refundClock({ refundMinor: 100, dueBy, landedAt: new Date("2026-10-06T09:01:00Z") });
    expect(clock).toMatchObject({ state: "landed", onTime: true });
  });
  it("says due while inside the promise and overdue after it", () => {
    expect(refundClock({ refundMinor: 100, dueBy, landedAt: null, now: new Date("2026-10-10T00:00:00Z") }).state).toBe("due");
    expect(refundClock({ refundMinor: 100, dueBy, landedAt: null, now: new Date("2026-10-14T00:00:00Z") }).state).toBe("overdue");
  });
});

describe("the database twin", () => {
  it("seeds exactly the same holidays as this file", () => {
    const dir = join(__dirname, "../../../../../supabase/migrations");
    const file = readdirSync(dir).find((name) => name.startsWith("20260924140100_"));
    expect(file, "the V-24 migration").toBeDefined();
    const sql = readFileSync(join(dir, file!), "utf8");
    const seeded = [...sql.matchAll(/\('(\d{4}-\d{2}-\d{2})', '((?:[^']|'')+)', (true|false)\)/g)].map((m) => ({
      day: m[1],
      name: m[2]!.replace(/''/g, "'"),
      estimated: m[3] === "true",
    }));
    expect(seeded).toEqual(NG_PUBLIC_HOLIDAYS);
  });
});
