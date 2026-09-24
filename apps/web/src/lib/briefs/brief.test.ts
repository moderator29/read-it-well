import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { briefAreasFor, briefDraftFrom, briefLine } from "./brief";

const copy = getDictionary("en").frontDoor.briefs;

describe("a brief in words", () => {
  it("says what, where, the ceiling and the month, from facts only", () => {
    const line = briefLine(
      { areas: ["Yaba", "Surulere"], intent: "rent", propertyType: "apartment", bedroomsMin: 2, maxMinor: 300_000_000, moveFrom: "2026-11-01" },
      copy,
      "en",
    );
    expect(line).toBe("2+ bedroom flat to rent in Yaba or Surulere, up to ₦3,000,000, from November 2026");
  });

  it("takes the place from the closed list only", () => {
    expect(briefDraftFrom({ q: "2 bed in yaba near 14 Herbert Macaulay" }).areas).toEqual(["Yaba"]);
    expect(briefDraftFrom({ q: "14 Admiralty Way" }).areas).toEqual([]);
    expect(briefDraftFrom({ max: "3000000", beds: "2" })).toMatchObject({ maxMinor: 300_000_000, bedroomsMin: 2 });
  });

  it("offers only list names in a state", () => {
    expect(briefAreasFor("FC")).toContain("Wuse 2");
    expect(briefAreasFor("FC")).not.toContain("Yaba");
  });
});
