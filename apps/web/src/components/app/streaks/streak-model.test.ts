import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { STREAK_KINDS, STREAK_UNIT, keptCount, visibleMarks } from "./streak-model";

/**
 * D17's rules where the display can hold them: every kind is a behaviour with
 * a counterparty (none is a login or a visit), every kind has a name and a
 * unit, and the marks count only windows that have happened.
 */
const s = getDictionary("en").experienceFeatures.streaks;

describe("standing streaks", () => {
  it("has the six kinds D17 names, and none that counts an app-open", () => {
    expect([...STREAK_KINDS]).toEqual([
      "onTimeRent",
      "replyTime",
      "disputeFree",
      "freshness",
      "inspections",
      "completeListing",
    ]);
    for (const kind of STREAK_KINDS) expect(kind).not.toMatch(/login|open|visit|session|daily/i);
  });

  it("names every kind and its unit in words", () => {
    for (const kind of STREAK_KINDS) {
      expect(s.name[kind].trim()).not.toBe("");
      expect(s.unit[STREAK_UNIT[kind]].trim()).not.toBe("");
    }
  });

  it("draws at most twelve marks and counts only windows that happened", () => {
    const long = Array.from({ length: 20 }, () => "kept" as const);
    expect(visibleMarks(long)).toHaveLength(12);
    expect(keptCount(["kept", "missed", "kept", "open"])).toEqual({ kept: 2, total: 3 });
  });
});
