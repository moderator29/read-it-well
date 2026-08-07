import { describe, expect, it } from "vitest";
import { lagosInstant, whyNotBookable, MAX_DAYS_AHEAD } from "./schema";

/**
 * The two pieces of reservation logic that can be wrong without looking wrong.
 *
 * A table booked an hour out, or on a day the guest never picked, produces
 * somebody standing at a door being told there is no booking. Neither failure
 * announces itself anywhere before that moment, which is why they are tested
 * here rather than left to a form that appears to work.
 */

describe("a time in Lagos", () => {
  it("reads the wall clock as West Africa Time, not as the device's", () => {
    // 19:00 in Lagos is 18:00 UTC, all year. If this ever reads as UTC, every
    // diaspora guest books an hour out and nobody finds out until they arrive.
    const at = lagosInstant("2026-08-09", "19:00");
    expect(at?.toISOString()).toBe("2026-08-09T18:00:00.000Z");
  });

  it("does not drift with the seasons", () => {
    // Nigeria has never observed daylight saving, so January and August must
    // carry the same offset. A rule-based zone would not guarantee this.
    expect(lagosInstant("2026-01-15", "19:00")?.toISOString()).toBe(
      "2026-01-15T18:00:00.000Z",
    );
    expect(lagosInstant("2026-08-15", "19:00")?.toISOString()).toBe(
      "2026-08-15T18:00:00.000Z",
    );
  });

  it("refuses a date that does not exist", () => {
    // `new Date("2026-02-31")` is accepted and silently becomes 3 March, which
    // would confirm a table on a day nobody chose.
    expect(lagosInstant("2026-02-31", "19:00")).toBeNull();
    expect(lagosInstant("2026-13-01", "19:00")).toBeNull();
    expect(lagosInstant("2026-04-31", "19:00")).toBeNull();
  });

  it("accepts a leap day in a leap year and refuses it otherwise", () => {
    expect(lagosInstant("2028-02-29", "19:00")).not.toBeNull();
    expect(lagosInstant("2026-02-29", "19:00")).toBeNull();
  });

  it("refuses an impossible clock", () => {
    expect(lagosInstant("2026-08-09", "24:00")).toBeNull();
    expect(lagosInstant("2026-08-09", "19:60")).toBeNull();
  });

  it("refuses anything that is not the shape it expects", () => {
    // These reach the parser from a hand-edited hidden field, not from the UI.
    expect(lagosInstant("", "19:00")).toBeNull();
    expect(lagosInstant("2026-8-9", "19:00")).toBeNull();
    expect(lagosInstant("2026-08-09", "7pm")).toBeNull();
    expect(lagosInstant("tomorrow", "19:00")).toBeNull();
  });
});

describe("whether a moment can be booked", () => {
  const now = new Date("2026-08-07T12:00:00.000Z");

  it("accepts a time later today", () => {
    expect(whyNotBookable(new Date("2026-08-07T18:00:00.000Z"), now)).toBeNull();
  });

  it("refuses a time that has passed", () => {
    // The database refuses this too. This exists so the guest reads a sentence
    // rather than a constraint violation.
    expect(whyNotBookable(new Date("2026-08-07T09:00:00.000Z"), now)).toMatch(/passed/i);
  });

  it("refuses this exact moment, because a table needs some notice", () => {
    expect(whyNotBookable(now, now)).toMatch(/passed/i);
  });

  it("refuses a date further out than anybody knows their plans", () => {
    const tooFar = new Date(now.getTime() + (MAX_DAYS_AHEAD + 2) * 86_400_000);
    expect(whyNotBookable(tooFar, now)).toMatch(new RegExp(String(MAX_DAYS_AHEAD)));
  });

  it("accepts the last day inside the window", () => {
    const justInside = new Date(now.getTime() + (MAX_DAYS_AHEAD - 1) * 86_400_000);
    expect(whyNotBookable(justInside, now)).toBeNull();
  });
});
