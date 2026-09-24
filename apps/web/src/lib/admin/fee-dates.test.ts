import { describe, expect, it } from "vitest";
import { inForceCaption, rateStartLabel } from "./fee-dates";

const when = (iso: string) => new Date(iso).toUTCString();

describe("fee rate start dates", () => {
  it("never prints the seed's epoch as a date", () => {
    expect(inForceCaption("1970-01-01 00:00:00+00", when)).toBe("In force from launch");
    expect(inForceCaption("1970-01-01T00:00:00Z", when)).not.toMatch(/1970/);
    expect(rateStartLabel("1970-01-01T00:00:00Z", when)).toBe("From launch");
  });

  it("prints a real start date", () => {
    expect(inForceCaption("2026-10-01T00:00:00Z", when)).toBe(`In force since ${when("2026-10-01T00:00:00Z")}`);
    expect(rateStartLabel("2026-10-01T00:00:00Z", when)).toBe(when("2026-10-01T00:00:00Z"));
  });
});
