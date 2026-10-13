import { describe, expect, it } from "vitest";
import { mrzCheckDigit, mrzLines, mrzName, passportNumber, rosettePaths, wavePaths } from "./identity";
import { factsFrom, withHidden, type PassportFacts } from "./model";

const ID = "11111111-2222-4333-8444-555555555555";
const FACTS = factsFrom({
  subject_id: ID,
  handle: "ada",
  display_name: "Adaeze Okonkwo-Eze",
  photo: null,
  roles: ["landlord"],
  joined_at: "2026-08-07T08:00:00Z",
  verification: "gold",
  rentals: 1,
  stays: null,
  review_count: null,
  review_average: null,
  reply_band: null,
  pidgin_ok: null,
}) as PassportFacts;

describe("the passport number", () => {
  it("is one letter and eight characters, the width of a passport number", () => {
    expect(passportNumber(ID)).toMatch(/^V[0-9A-HJ-NP-Z]{8}$/);
  });

  it("is the same every time for one account and different for another", () => {
    expect(passportNumber(ID)).toBe(passportNumber(ID.toUpperCase()));
    expect(passportNumber(ID)).not.toBe(passportNumber("11111111-2222-4333-8444-555555555556"));
  });

  it("does not carry the account id", () => {
    const number = passportNumber(ID).slice(1).toLowerCase();
    for (const part of ID.split("-")) expect(number.includes(part)).toBe(false);
  });

  it("is spread: a thousand ids make a thousand numbers", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(passportNumber(`00000000-0000-4000-8000-${String(i).padStart(12, "0")}`));
    expect(seen.size).toBe(1000);
  });
});

describe("the machine-readable lines", () => {
  it("computes the ICAO 9303 check digit (the specification's own examples)", () => {
    expect(mrzCheckDigit("L898902C3")).toBe("6");
    expect(mrzCheckDigit("740812")).toBe("2");
    expect(mrzCheckDigit("120415")).toBe("9");
  });

  it("folds a name to capital letters and fillers", () => {
    expect(mrzName("Adaeze Okonkwo-Eze")).toBe("ADAEZE<OKONKWO<EZE");
    expect(mrzName("Ọláwálé Ìbídùn")).toBe("OLAWALE<IBIDUN");
    expect(mrzName(null)).toBe("");
  });

  it("is two lines of forty-four characters from the MRZ alphabet only", () => {
    const [one, two] = mrzLines(FACTS);
    expect(one).toHaveLength(44);
    expect(two).toHaveLength(44);
    expect(one + two).toMatch(/^[A-Z0-9<]+$/);
    expect(one.startsWith("P<VALADAEZE<OKONKWO<EZE")).toBe(true);
    expect(two.startsWith(passportNumber(ID))).toBe(true);
  });

  it("carries the join date and the role only when they are shown", () => {
    const [, shown] = mrzLines(FACTS);
    expect(shown).toContain("260807");
    const [, hidden] = mrzLines(withHidden(FACTS, ["joined", "role", "verification"]));
    expect(hidden).not.toContain("260807");
    /* After the number, its check digit and VAL, the date, its check, the role and the level are all filler. */
    expect(hidden.slice(13, 22)).toBe("<<<<<<<<<");
    /* All that follows is the closing check digit over what is shown, then filler. */
    expect(hidden.slice(22)).toMatch(/^[0-9]<+$/);
  });

  it("never carries the account id, a phone number or an email", () => {
    const text = mrzLines(FACTS).join("");
    expect(text).not.toMatch(/[0-9A-F]{8}-/i);
    expect(text).not.toContain("@");
  });
});

describe("the security pattern", () => {
  it("is deterministic for a number and small enough to ship", () => {
    const number = passportNumber(ID);
    expect(rosettePaths(number)).toEqual(rosettePaths(number));
    expect(wavePaths(number)).toEqual(wavePaths(number));
    const size = [...rosettePaths(number), ...wavePaths(number)].join("").length;
    expect(size).toBeLessThan(45_000);
  });

  it("is different for another passport", () => {
    expect(rosettePaths(passportNumber(ID))).not.toEqual(rosettePaths(passportNumber("99999999-2222-4333-8444-555555555555")));
  });
});
