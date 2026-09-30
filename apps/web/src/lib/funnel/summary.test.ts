import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { byLocale, conversion, totals } from "./summary";
import { FUNNEL_DOORS, FUNNEL_STEPS, doorFromChapter } from "./steps";

const MIGRATION = readFileSync(
  join(__dirname, "../../../../../supabase/migrations/pending/20260930180100_a6_first_party_front_door_funnel.sql"),
  "utf8",
);

describe("A6 funnel", () => {
  it("names the same steps and doors as the table's checks", () => {
    for (const step of FUNNEL_STEPS) expect(MIGRATION).toContain(`'${step}'`);
    for (const door of FUNNEL_DOORS) expect(MIGRATION).toContain(`'${door}'`);
  });

  it("adds up steps and prints a conversion only with a denominator", () => {
    const rows = [
      { step: "landing_view", locale: "en", surface: "web", visits: 80 },
      { step: "landing_view", locale: "ha", surface: "web", visits: 20 },
      { step: "get_started", locale: "en", surface: "web", visits: 25 },
    ];
    const t = totals(rows);
    expect(t.get("landing_view")).toBe(100);
    expect(conversion(t.get("landing_view"), t.get("get_started"))).toBe(25);
    expect(conversion(0, 5)).toBeNull();
    expect(conversion(undefined, 5)).toBeNull();
    expect(byLocale(rows, "landing_view")).toEqual([
      ["en", 80],
      ["ha", 20],
    ]);
  });

  it("reads the door from the room a link sat in", () => {
    expect(doorFromChapter("hero", null)).toBe("hero");
    expect(doorFromChapter("close", null)).toBe("close");
    expect(doorFromChapter("hero", "header")).toBe("header");
    expect(doorFromChapter("mystery", null)).toBe("other");
  });
});
