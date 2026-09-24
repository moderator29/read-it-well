import { describe, expect, it } from "vitest";
import { FUZZY_THRESHOLD, createMatcher, factsAllowHit, matchNames, nameScore, normaliseName, outcomeOf, type ListedName } from "./match";

const LISTED: ListedName[] = [
  { entryId: "e1", source: "un", reference: "FXi.001", primaryName: "ZEPHYRIN QUILLAN BRAXTOVÉ", names: ["braxtove quillan zephyrin", "braxtove zeph"] },
  { entryId: "e2", source: "ng", reference: "FXN.001", primaryName: "Quorvin Adelmaro Tesk", names: ["adelmaro quorvin tesk", "quorvin tesk"] },
];

describe("normalising a name (SCUML item 8)", () => {
  it("folds case, diacritics, punctuation, honorifics and word order", () => {
    expect(normaliseName("BRAXTOVÉ, Zephyrin Quillan")).toBe("braxtove quillan zephyrin");
    expect(normaliseName("Chief Ọládélé Adé-Bámidélé")).toBe("ade bamidele oladele");
    expect(normaliseName("  ")).toBe("");
  });
});

describe("matching (SCUML item 8)", () => {
  it("records an exact match on the name in any order, and on an alias", () => {
    const m = matchNames(["Quillan Zephyrin Braxtove", "Zeph Braxtove"], LISTED);
    expect(m.map((x) => [x.reference, x.kind, x.score])).toEqual([
      ["FXi.001", "exact", 1],
      ["FXi.001", "exact", 1],
    ]);
  });

  it("scores a close spelling as fuzzy, above the threshold, and records it separately", () => {
    const m = matchNames(["Quorvin Adelmaro Tesc"], LISTED);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ kind: "fuzzy", reference: "FXN.001" });
    expect(m[0]!.score).toBeGreaterThanOrEqual(FUZZY_THRESHOLD);
    expect(m[0]!.score).toBeLessThan(1);
    expect(outcomeOf(m).outcome).toBe("fuzzy");
  });

  it("does not raise a shared surname, a single word, or an unrelated person", () => {
    expect(matchNames(["Adaeze Tesk"], LISTED)).toEqual([]);
    expect(matchNames(["Tesk"], LISTED)).toEqual([]);
    expect(matchNames(["Chinedu Okafor"], LISTED)).toEqual([]);
    expect(outcomeOf([]).outcome).toBe("clear");
    expect(nameScore("tesk", "tesk quorvin")).toBe(0);
  });

  it("puts exact matches before fuzzy ones", () => {
    const m = matchNames(["Quorvin Adelmaro Tesc", "Zeph Braxtove"], LISTED);
    expect(m[0]!.kind).toBe("exact");
    expect(outcomeOf(m)).toEqual({ outcome: "exact", best: 1 });
  });

  it("folds transliterations: Mohammed Yousef finds Muhammad Yusuf, as a close match", () => {
    const listed = [{ entryId: "e9", source: "un" as const, reference: "FXi.009", primaryName: "Muhammad Yusuf", names: ["muhammad yusuf"] }];
    const m = matchNames(["Mohammed Yousef"], listed);
    expect(m).toHaveLength(1);
    expect(m[0]!.kind).toBe("fuzzy");
    expect(m[0]!.score).toBeGreaterThanOrEqual(FUZZY_THRESHOLD);
  });

  it("never matches one word from our side, and needs two thirds of the listed name", () => {
    const listed = [{ entryId: "e8", source: "un" as const, reference: "FXi.008", primaryName: "Musa Ibrahim Kabiru Danjuma", names: ["danjuma ibrahim kabiru musa"] }];
    expect(matchNames(["Danjuma"], listed)).toEqual([]);
    expect(matchNames(["Musa Ibrahim"], listed)).toEqual([]);
    expect(matchNames(["Musa Ibrahim Danjuma"], listed)).toHaveLength(1);
  });

  it("reads Mohd as Muhammad, and an al- prefix joined or apart as the same word", () => {
    const listed = [
      { entryId: "a", source: "un" as const, reference: "FXi.010", primaryName: "Muhammad Yusuf Danladi", names: ["danladi muhammad yusuf"] },
      { entryId: "b", source: "un" as const, reference: "FXi.011", primaryName: "Ahmed Al Hassan Gwarzo", names: ["ahmed al gwarzo hassan"] },
    ];
    expect(matchNames(["Mohd Yusuf Danladi"], listed).map((m) => m.reference)).toEqual(["FXi.010"]);
    expect(matchNames(["Ahmed Alhassan Gwarzo"], listed).map((m) => m.reference)).toEqual(["FXi.011"]);
  });

  it("needs every word of a listing of three words or fewer", () => {
    const listed = [{ entryId: "c", source: "un" as const, reference: "FXi.012", primaryName: "Musa Ibrahim Danjuma", names: ["danjuma ibrahim musa"] }];
    expect(matchNames(["Musa Ibrahim"], listed)).toEqual([]);
  });

  it("weights coverage by rarity: common words do not carry a four-word listing", () => {
    const common = (i: number) => ({ entryId: `x${i}`, source: "un" as const, reference: `FXc.${i}`, primaryName: `Muhammad Ali ${i}`, names: [`ali muhammad w${i}zz`] });
    const target = { entryId: "t", source: "un" as const, reference: "FXi.013", primaryName: "Muhammad Ali Musa Danjuma", names: ["ali danjuma muhammad musa"] };
    const listed = [target, ...Array.from({ length: 20 }, (_, i) => common(i))];
    /* Three of four words, but the one missing is the rare one. */
    expect(matchNames(["Muhammad Ali Musa"], listed).filter((m) => m.reference === "FXi.013")).toEqual([]);
    expect(matchNames(["Muhammad Musa Danjuma"], listed).map((m) => m.reference)).toContain("FXi.013");
  });

  it("raises a close match only when the facts do not disagree; an exact one always", () => {
    expect(factsAllowHit({ datesOfBirth: ["1975-01-09"], nationalities: ["Testland"] }, {})).toBe(true);
    expect(factsAllowHit({ datesOfBirth: ["1975-01-09"] }, { dateOfBirth: "1975-06-01" })).toBe(true);
    expect(factsAllowHit({ datesOfBirth: ["1975-01-09"] }, { dateOfBirth: "1990-06-01" })).toBe(false);
    expect(factsAllowHit({ nationalities: ["Testland"] }, { nationality: "Nigeria" })).toBe(false);
    const listed = [{ entryId: "d", source: "ng" as const, reference: "FXN.001", primaryName: "Quorvin Adelmaro Tesk", names: ["adelmaro quorvin tesk"], datesOfBirth: ["1975-01-09"] }];
    const matcher = createMatcher(listed);
    expect(matcher(["Quorvin Adelmaro Tesc"], { dateOfBirth: "1990-01-01" })[0]).toMatchObject({ kind: "fuzzy", raise: false });
    expect(matcher(["Quorvin Adelmaro Tesk"], { dateOfBirth: "1990-01-01" })[0]).toMatchObject({ kind: "exact", raise: true });
  });
});
