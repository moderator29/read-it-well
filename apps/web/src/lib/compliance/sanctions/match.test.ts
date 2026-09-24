import { describe, expect, it } from "vitest";
import { FUZZY_THRESHOLD, matchNames, nameScore, normaliseName, outcomeOf, type ListedName } from "./match";

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
});
