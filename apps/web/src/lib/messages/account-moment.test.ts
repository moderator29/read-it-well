import { describe, expect, it } from "vitest";

import {
  MAX_CANDIDATES,
  accountNumbersIn,
  banksNamedIn,
  candidateBanks,
  isAccountMoment,
  lastFour,
  nubanValidFor,
} from "./account-moment";

const REGISTRY = [
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "999992", name: "OPay Digital Services Limited (OPay)" },
];

describe("finding an account number in a message", () => {
  it("finds ten digits written plainly, grouped, dashed or dotted", () => {
    expect(accountNumbersIn("Pay into 0123456785 GTB")).toEqual(["0123456785"]);
    expect(accountNumbersIn("acct: 0123 456 785")).toEqual(["0123456785"]);
    expect(accountNumbersIn("0123-456-785 please")).toEqual(["0123456785"]);
    expect(accountNumbersIn("0123.456.785")).toEqual(["0123456785"]);
  });

  it("refuses an eleven-digit phone number and a number inside a longer run", () => {
    expect(accountNumbersIn("call me 08031234567")).toEqual([]);
    expect(accountNumbersIn("ref 123456789012")).toEqual([]);
  });

  it("refuses a phone number written with +234 or 234", () => {
    expect(accountNumbersIn("+234 8031234567")).toEqual([]);
    expect(accountNumbersIn("2348031234567")).toEqual([]);
  });

  it("de-duplicates and keeps order", () => {
    expect(accountNumbersIn("0123456785 or 0123456784, again 0123456785")).toEqual(["0123456785", "0123456784"]);
  });

  it("says nothing about ordinary messages, prices and dates", () => {
    expect(isAccountMoment("The rent is 2,500,000 a year")).toBe(false);
    expect(isAccountMoment("Saturday 12/10/2026 at 10am")).toBe(false);
    expect(isAccountMoment("")).toBe(false);
  });

  it("keeps only the last four", () => {
    expect(lastFour("0123456785")).toBe("6785");
    expect(lastFour("0123 456 785")).toBe("6785");
  });
});

describe("the NUBAN check digit", () => {
  it("accepts the digit the CBN algorithm gives and refuses the others", () => {
    expect(nubanValidFor("058", "0123456785")).toBe(true);
    expect(nubanValidFor("057", "0123456788")).toBe(true);
    expect(nubanValidFor("058", "0123456784")).toBe(false);
  });
  it("cannot check a processor-only code and says so by refusing", () => {
    expect(nubanValidFor("50211", "0123456785")).toBe(false);
    expect(nubanValidFor("058", "123")).toBe(false);
  });
});

describe("narrowing the bank", () => {
  it("reads the banks a message names, as whole words", () => {
    expect(banksNamedIn("send to gtb", REGISTRY).map((b) => b.code)).toEqual(["058"]);
    expect(banksNamedIn("my Opay is fine", REGISTRY).map((b) => b.code)).toEqual(["999992"]);
    expect(banksNamedIn("Access bank", REGISTRY).map((b) => b.code)).toEqual(["044"]);
    expect(banksNamedIn("I love Cuba", REGISTRY)).toEqual([]);
  });

  it("uses a named bank first", () => {
    expect(candidateBanks("0123456785", "GTB 0123456785", REGISTRY).map((b) => b.code)).toEqual(["058"]);
  });

  it("falls back to the check digit, and never proposes more than two", () => {
    /* 0123456784 satisfies 044, 011 and 033: three is too many to ask. */
    expect(candidateBanks("0123456784", "0123456784", REGISTRY)).toEqual([]);
    /* 0123456788 satisfies Zenith alone. */
    expect(candidateBanks("0123456788", "0123456788", REGISTRY).map((b) => b.code)).toEqual(["057"]);
    for (const nuban of ["0123456780", "0123456781", "0123456785", "0123456788"]) {
      expect(candidateBanks(nuban, nuban, REGISTRY).length).toBeLessThanOrEqual(MAX_CANDIDATES);
    }
  });
});
