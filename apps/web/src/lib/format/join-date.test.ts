import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getDictionary } from "@vallo/i18n";
import { joinDate } from "./join-date";
import { counterpartFactsFrom, personFacts } from "@/lib/messages/person-line";
import { recordLines, type RecordRow } from "@/lib/trust/record";

describe("the exact join date", () => {
  it("is the day, the month in full and the year, in the reader's locale format", () => {
    expect(joinDate("2026-10-09T10:00:00Z", "en")).toBe("9 October 2026");
    expect(joinDate("2026-03-02T10:00:00Z", "en")).toBe("2 March 2026");
  });

  it("counts the day on the Lagos calendar, not the reader's phone's or UTC", () => {
    /* 23:30 UTC on the 8th is 00:30 on the 9th in Lagos (UTC+1). */
    expect(joinDate("2026-10-08T23:30:00Z", "en")).toBe("9 October 2026");
    /* 22:59 UTC on the 8th is still the 8th in Lagos. */
    expect(joinDate("2026-10-08T22:59:00Z", "en")).toBe("8 October 2026");
  });

  it("draws nothing for a missing or unreadable stamp", () => {
    expect(joinDate(null, "en")).toBe("");
    expect(joinDate(undefined, "en")).toBe("");
    expect(joinDate("", "en")).toBe("");
    expect(joinDate("not a date", "en")).toBe("");
  });

  it("is worded in every locale without throwing", () => {
    for (const locale of ["en", "yo", "ig", "ha"] as const) {
      expect(joinDate("2026-10-09T10:00:00Z", locale), locale).toMatch(/2026/);
    }
  });
});

describe("every surface that says 'On Vallo since' says the day", () => {
  it("the thread header's person line", () => {
    const copy = getDictionary("en").trustVisible.person;
    const facts = counterpartFactsFrom({ member_since: "2026-10-09T10:00:00Z" });
    expect(personFacts(facts, copy, "en").map((f) => f.text)).toEqual(["On Vallo since 9 October 2026"]);
  });

  it("the Record on a profile, a listing and the Record page", () => {
    const copy = getDictionary("en").trustVisible.record;
    const record = { code: "VRABC123", since: "2026-10-09T10:00:00Z" } as unknown as RecordRow;
    const lines = recordLines(record, copy, "en");
    expect(lines.find((l) => l.key === "since")?.text).toBe("On Vallo since 9 October 2026");
  });

  it("the profile header's joined line is fed the day by its one caller", () => {
    const page = readFileSync(new URL("../../app/(app)/u/[handle]/page.tsx", import.meta.url), "utf8");
    expect(page).toContain("joinedLabel={joinDate(view.profile.claimedAt, locale)}");
    expect(page).not.toContain("joinedLabel={monthYear(");
  });

  it("no surface formats a join date as month and year any more", () => {
    for (const path of ["../messages/person-line.ts", "../trust/record.ts"]) {
      const source = readFileSync(new URL(path, import.meta.url), "utf8");
      expect(source, path).toContain("joinDate(");
    }
  });
});
