import { describe, expect, it } from "vitest";
import { budgetBand, demandCell } from "./cell";

describe("a search becomes a cell and nothing else", () => {
  it("keeps a closed-list neighbourhood and throws the typed words away", () => {
    const cell = demandCell({ q: "cheap 2 bed flat in yaba near my office at 14 Herbert Macaulay", intent: "rent", bedrooms: 2, maxMinor: 250_000_000, results: 0 });
    expect(cell).toEqual({ stateCode: "LA", areaKey: "Yaba", market: "rent", bedroomsMin: 2, budgetBand: 3, results: 0 });
    expect(JSON.stringify(cell)).not.toContain("Herbert");
    expect(JSON.stringify(cell)).not.toContain("office");
  });

  it("records nothing for a search that names no place, rooms or budget", () => {
    expect(demandCell({ q: "somewhere quiet", results: 4 })).toBeNull();
    expect(demandCell({ results: 0 })).toBeNull();
  });

  it("caps the bedrooms and bands the budget", () => {
    expect(demandCell({ bedrooms: 9, results: 1 })?.bedroomsMin).toBe(5);
    expect(budgetBand(100_000_000)).toBe(1);
    expect(budgetBand(100_000_001)).toBe(2);
    expect(budgetBand(350_000_000)).toBe(3);
    expect(budgetBand(2_000_000_000)).toBe(6);
    expect(budgetBand(0)).toBeNull();
  });

  it("takes only a closed-list name from the typed words, never the words", () => {
    expect(demandCell({ q: "2 bed at 14 Admiralty Way", bedrooms: 2, results: 0 })?.areaKey).toBeNull();
    expect(demandCell({ q: "flat in yaba please", results: 0 })?.areaKey).toBe("Yaba");
    expect(demandCell({ q: "14 Admiralty Way", results: 0 })).toBeNull();
  });
});
