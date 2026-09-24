import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { demandCounts, demandWhat } from "./words";

const copy = getDictionary("en").frontDoor.demand;

describe("a demand cell in words", () => {
  it("says what was looked for, with the budget as a band edge", () => {
    expect(demandWhat({ areaKey: "Yaba", market: "rent", bedroomsMin: 2, budgetBand: 3 }, copy, "en")).toBe(
      "2+ bedroom homes to rent in Yaba, rent up to ₦3.5m a year",
    );
    expect(demandWhat({ areaKey: "Lekki", market: "any", bedroomsMin: null, budgetBand: null }, copy, "en")).toBe(
      "Homes to rent or buy in Lekki",
    );
    expect(demandWhat({ areaKey: "Ikoyi", market: "rent", bedroomsMin: 0, budgetBand: 6 }, copy, "en")).toContain("over");
  });

  it("counts searches, shortfalls and real supply, and says none when there is none", () => {
    expect(demandCounts({ searches: 41, unmet: 30, realSupply: 0 }, copy)).toBe(
      "41 people searched, 30 of them found fewer than three homes. No real listing on Vallo matches today.",
    );
    expect(demandCounts({ searches: 5, unmet: 5, realSupply: 3 }, copy)).toContain("3 real listings");
  });
});
