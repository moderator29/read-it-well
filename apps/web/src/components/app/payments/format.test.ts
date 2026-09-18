import { describe, expect, it } from "vitest";
import { cardBrandLabel, cardExpired, cardExpiry, maskNumber } from "./format";

describe("masking", () => {
  it("shows only the last four digits", () => {
    expect(maskNumber("0123456789")).toBe("•••• 6789");
    expect(maskNumber("4081")).toBe("•••• 4081");
  });
  it("never shows fewer than four as a tail", () => {
    expect(maskNumber("12")).toBe("••••");
    expect(maskNumber(null)).toBe("••••");
  });
});

describe("card expiry", () => {
  it("prints MM/YY from either year shape", () => {
    expect(cardExpiry(9, 2028)).toBe("09/28");
    expect(cardExpiry(12, 27)).toBe("12/27");
  });
  it("prints nothing when a half is missing or impossible", () => {
    expect(cardExpiry(null, 2028)).toBe("");
    expect(cardExpiry(13, 2028)).toBe("");
  });
  it("knows a card behind this month is expired", () => {
    const now = new Date("2026-09-18T12:00:00Z");
    expect(cardExpired(8, 2026, now)).toBe(true);
    expect(cardExpired(9, 2026, now)).toBe(false);
    expect(cardExpired(1, 27, now)).toBe(false);
  });
});

describe("brand label", () => {
  it("names the brands Paystack sends", () => {
    expect(cardBrandLabel("visa")).toBe("Visa");
    expect(cardBrandLabel("mastercard debit")).toBe("Mastercard");
    expect(cardBrandLabel("verve")).toBe("Verve");
  });
  it("falls back honestly", () => {
    expect(cardBrandLabel(null)).toBe("Card");
    expect(cardBrandLabel("afrigo")).toBe("Afrigo");
  });
});
