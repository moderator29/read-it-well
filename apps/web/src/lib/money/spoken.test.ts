import { describe, expect, it } from "vitest";
import { spokenMoney, spokenPeriodOf, spokenSuffix } from "./spoken";

describe("spokenMoney (B15)", () => {
  it("says a compact figure in words", () => {
    expect(spokenMoney(280_000_000)).toBe("2.8 million naira");
    expect(spokenMoney(280_000_000, "en", "NGN", "year")).toBe("2.8 million naira a year");
    expect(spokenMoney(4_500_000)).toBe("45 thousand naira");
    expect(spokenMoney(150_000_000_000)).toBe("1.5 billion naira");
  });

  it("truncates like the compact print, never rounding up", () => {
    /* ₦14,700,000 prints ₦14.7m; ₦999,999 prints ₦999.9k. */
    expect(spokenMoney(1_470_000_000)).toBe("14.7 million naira");
    expect(spokenMoney(99_999_900)).toBe("999.9 thousand naira");
  });

  it("says small figures in full, with kobo", () => {
    expect(spokenMoney(95_000)).toBe("950 naira");
    expect(spokenMoney(95_050)).toBe("950 naira 50 kobo");
  });

  it("says the period, never a slash", () => {
    expect(spokenMoney(25_000_000, "en", "NGN", "night")).toBe("250 thousand naira a night");
    expect(spokenMoney(25_000_000, "en", "NGN", "month")).not.toContain("/");
  });

  it("gives the full figure, not English words, in the other locales", () => {
    expect(spokenMoney(280_000_000, "yo")).toMatch(/2,800,000/);
  });

  it("maps periods", () => {
    expect(spokenPeriodOf("year")).toBe("year");
    expect(spokenPeriodOf("sale")).toBeNull();
    expect(spokenPeriodOf(undefined)).toBeNull();
  });

  it("says a short suffix in words", () => {
    expect(spokenSuffix("/yr")).toBe("a year");
    expect(spokenSuffix(" /night")).toBe("a night");
    expect(spokenSuffix("per year")).toBe("per year");
    expect(spokenSuffix("/sqm")).toBe("sqm");
    expect(spokenSuffix(undefined)).toBe("");
  });
});
