import { describe, expect, it } from "vitest";

import {
  DecimalError,
  asDecimalString,
  cryptoForKobo,
  fromAtomic,
  koboForCrypto,
  parseRate,
  quoteAgrees,
  toAtomic,
} from "./decimal";

/**
 * Quote maths: naira kobo to crypto atomic units and back, exactly, at the
 * asset's own precision. No float ever carries a money figure here.
 */

describe("toAtomic / fromAtomic", () => {
  it("reads a six-decimal USDT amount exactly", () => {
    expect(toAtomic("103.014695", 6)).toBe(103_014_695n);
    expect(toAtomic("1", 6)).toBe(1_000_000n);
    expect(toAtomic("0.000001", 6)).toBe(1n);
  });

  it("reads an eight-decimal bitcoin amount exactly", () => {
    expect(toAtomic("0.00113334", 8)).toBe(113_334n);
  });

  it("refuses more decimals than the asset has rather than rounding", () => {
    expect(() => toAtomic("1.0000001", 6)).toThrow(DecimalError);
    expect(() => toAtomic("0.000000001", 8)).toThrow(DecimalError);
  });

  it("refuses anything that is not a plain decimal", () => {
    for (const bad of ["", "-1", "1e-7", "1,000", "abc", "1.2.3"]) expect(() => toAtomic(bad, 6)).toThrow(DecimalError);
  });

  it("writes atomic units back, trimmed for reading and fixed for sending", () => {
    expect(fromAtomic(103_014_695n, 6)).toBe("103.014695");
    expect(fromAtomic(1_000_000n, 6)).toBe("1");
    expect(fromAtomic(1_000_000n, 6, { fixed: true })).toBe("1.000000");
    expect(fromAtomic(5n, 8)).toBe("0.00000005");
    expect(fromAtomic(0n, 6)).toBe("0");
  });

  it("round-trips every value it writes", () => {
    for (const atomic of [0n, 1n, 999_999n, 1_000_001n, 123_456_789_012n]) {
      expect(toAtomic(fromAtomic(atomic, 6), 6)).toBe(atomic);
    }
  });
});

describe("asDecimalString", () => {
  it("accepts strings and exact numbers, refuses exponents and negatives", () => {
    expect(asDecimalString("12.5")).toBe("12.5");
    expect(asDecimalString(12.5)).toBe("12.5");
    expect(asDecimalString(1e-7)).toBeNull();
    expect(asDecimalString(-1)).toBeNull();
    expect(asDecimalString(Number.NaN)).toBeNull();
    expect(asDecimalString(null)).toBeNull();
  });
});

describe("kobo to crypto", () => {
  const usdt = parseRate("1650.25");

  it("prices a charge in USDT rounded UP to the asset's precision", () => {
    // ₦170,000 / ₦1,650.25 = 103.0146947... USDT, so the payer sends 103.014695.
    expect(cryptoForKobo(17_000_000, usdt, 6)).toBe(103_014_695n);
  });

  it("prices a charge in bitcoin at eight decimals", () => {
    // ₦170,000 / ₦150,000,000 = 0.001133333... BTC, rounded up.
    expect(cryptoForKobo(17_000_000, parseRate("150000000"), 8)).toBe(113_334n);
  });

  it("values crypto in kobo rounded DOWN, so a payment is never credited with money it did not bring", () => {
    expect(koboForCrypto(103_014_695n, usdt, 6)).toBe(17_000_000);
    expect(koboForCrypto(103_014_694n, usdt, 6)).toBe(16_999_999);
  });

  it("always covers the charge after rounding", () => {
    for (const kobo of [1, 99, 100, 12_345, 17_000_000, 250_000_000_00]) {
      const atomic = cryptoForKobo(kobo, usdt, 6);
      expect(koboForCrypto(atomic, usdt, 6)).toBeGreaterThanOrEqual(kobo);
    }
  });

  it("refuses a non-integer, zero or negative kobo figure, and a zero rate", () => {
    expect(() => cryptoForKobo(1.5, usdt, 6)).toThrow(DecimalError);
    expect(() => cryptoForKobo(0, usdt, 6)).toThrow(DecimalError);
    expect(() => parseRate("0")).toThrow(DecimalError);
    expect(() => parseRate("-5")).toThrow(DecimalError);
  });
});

describe("quoteAgrees", () => {
  const rate = parseRate("1650.25");

  it("accepts the provider's figure when it matches its own rate", () => {
    expect(quoteAgrees(103_014_695n, 17_000_000, rate, 6)).toBe(true);
    expect(quoteAgrees(103_500_000n, 17_000_000, rate, 6)).toBe(true); // within 1%
  });

  it("catches a unit slip: naira read as kobo, or the wrong precision", () => {
    expect(quoteAgrees(1_030_147n, 17_000_000, rate, 6)).toBe(false); // 100x short
    expect(quoteAgrees(10_301_469_500n, 17_000_000, rate, 6)).toBe(false); // 100x over
  });
});
