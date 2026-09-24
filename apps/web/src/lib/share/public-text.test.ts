import { describe, expect, it } from "vitest";
import cases from "./rule-ten-cases.json";
import { NEIGHBOURHOODS } from "../places/neighbourhoods";
import { publicAreaName } from "./public-text";

/**
 * RULE 10, BY CONSTRUCTION. The reviewer's cases (`rule-ten-cases.json`,
 * copied from the review of 24 September) are strings a lister can type as
 * an area or a city. None of them may reach a public surface unless the
 * whole string is a name on the closed list, and then only in the list's
 * spelling. The SQL twin is probed against the same cases.
 */

const LIST_NAMES = new Set(NEIGHBOURHOODS.map((n) => n.area.toLowerCase()));

describe("a place a lister typed, before it reaches a public surface", () => {
  it("admits none of the reviewer's cases except whole names on the closed list", () => {
    for (const text of cases as string[]) {
      const area = publicAreaName(text);
      if (LIST_NAMES.has(text.trim().toLowerCase())) {
        expect(area?.toLowerCase(), text).toBe(text.trim().toLowerCase());
      } else {
        expect(area, text).toBeNull();
      }
    }
  });

  it("prints a list name in the list's spelling, whatever the case, spacing or width", () => {
    expect(publicAreaName("  YABA ")).toBe("Yaba");
    expect(publicAreaName("lekki   phase 1")).toBe("Lekki Phase 1");
    expect(publicAreaName("Ｙａｂａ")).toBe("Yaba");
    expect(publicAreaName("VI")).toBe("Victoria Island");
  });

  it("refuses a lookalike letter from another alphabet", () => {
    expect(publicAreaName("Yаba")).toBeNull();
  });

  it("holds a name to its own state", () => {
    expect(publicAreaName("Wuse 2", "LA")).toBeNull();
    expect(publicAreaName("Wuse 2", "FC")).toBe("Wuse 2");
  });
});
