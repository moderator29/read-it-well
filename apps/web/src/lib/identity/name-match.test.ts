import { describe, expect, it } from "vitest";

import { businessNamesMatch, matchesAnyName, nameTokens, namesMatch } from "./name-match";

describe("nameTokens", () => {
  it("folds case, accents and punctuation, and strips titles", () => {
    expect(nameTokens("Chief (Dr) Ọlábísí  Adé-Okeke, Jnr.")).toEqual(["OLABISI", "ADE", "OKEKE"]);
    expect(nameTokens("ALHAJI Musa Bello")).toEqual(["MUSA", "BELLO"]);
  });

  it("keeps words that are titles and surnames both", () => {
    expect(nameTokens("Peter Obi")).toEqual(["PETER", "OBI"]);
    expect(nameTokens("Prince Adewale Eze")).toEqual(["PRINCE", "ADEWALE", "EZE"]);
  });
});

describe("namesMatch: the same person, written differently", () => {
  const same: [string, string][] = [
    ["OKEKE CHIDI EMMANUEL", "Chidi Okeke"],
    ["Chidi Okeke", "OKEKE CHIDI EMMANUEL"],
    ["CHIEF (DR) C. OKEKE", "Chidi Okeke"],
    ["ENGR OKEKE CHIDI", "chidi okeke"],
    ["ADEBAYO-OGUNLESI TOLU", "Tolu Adebayo Ogunlesi"],
    ["ADEBAYOOGUNLESI TOLU", "Tolu Adebayo Ogunlesi"],
    ["MRS NGOZI ADAOBI NWOSU", "Adaobi Nwosu"],
    ["ALHAJI MUSA BELLO", "Musa Bello"],
  ];
  for (const [a, b] of same) {
    it(`${a} ~ ${b}`, () => {
      expect(namesMatch(a, b).match).toBe(true);
    });
  }
});

describe("namesMatch: different people", () => {
  const different: [string, string][] = [
    ["OKEKE CHIDI", "Chidi Okafor"],
    ["CHIDI", "Chidi Okeke"],
    ["C. O.", "Chidi Okeke"],
    ["C OKEKE", "Chinedu Obi"],
    ["MUSA BELLO", "Musa Bala"],
    ["", "Chidi Okeke"],
    ["ADAOBI NWOSU", "Adaobi Nwankwo Chiamaka"],
  ];
  for (const [a, b] of different) {
    it(`${a || "(empty)"} is not ${b}`, () => {
      expect(namesMatch(a, b).match).toBe(false);
    });
  }

  it("never lets two initials carry a match", () => {
    expect(namesMatch("C E OKEKE", "Chidi Emmanuel Okeke").match).toBe(false);
  });

  it("requires the surname on record when one is known", () => {
    expect(namesMatch("OKEKE CHIDI", "Chidi Okeke", "Okeke").match).toBe(true);
    expect(namesMatch("CHIDI EMMANUEL", "Chidi Emmanuel Okeke", "Okeke").match).toBe(false);
  });

  it("writes a reason that names the rule and never the names", () => {
    const result = namesMatch("OKEKE CHIDI EMMANUEL", "Chidi Okeke");
    expect(result.reason).toMatch(/further part/);
    expect(result.reason).not.toMatch(/OKEKE|CHIDI|Okeke/);
  });
});

describe("matchesAnyName", () => {
  it("matches when any name on record matches", () => {
    expect(matchesAnyName("OKEKE CHIDI", ["Somebody Else", "Chidi Okeke"]).match).toBe(true);
  });
  it("says so when there is nothing on record", () => {
    expect(matchesAnyName("OKEKE CHIDI", [])).toEqual({ match: false, reason: "no verified name on record" });
  });
});

describe("businessNamesMatch", () => {
  it("ignores company suffixes and Nigeria", () => {
    expect(businessNamesMatch("ACME PROPERTIES NIG LTD", "Acme Properties Limited").match).toBe(true);
    expect(businessNamesMatch("Acme Properties & Co", "ACME PROPERTIES AND CO LTD").match).toBe(true);
  });
  it("refuses a shorter or a longer name", () => {
    expect(businessNamesMatch("ACME LTD", "Acme Properties Limited").match).toBe(false);
    expect(businessNamesMatch("ACME PROPERTIES HOMES LTD", "Acme Properties Limited").match).toBe(false);
  });
});
