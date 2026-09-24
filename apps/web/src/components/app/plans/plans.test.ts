import { describe, expect, it } from "vitest";
import { groupPlans, inFilter, lagosDay, planCount, planFilterFrom, type PlanItem } from "./plans";

const item = (id: string, on: string, over: Partial<PlanItem> = {}): PlanItem => ({
  id,
  kind: "stay",
  side: "stays",
  on,
  title: id,
  where: "",
  href: `/x/${id}`,
  ...over,
});

describe("Plans: one dated list (V-76)", () => {
  it("groups what is ahead as Today, This week and Later, soonest first", () => {
    const groups = groupPlans(
      [
        item("later", "2026-10-10"),
        item("today", "2026-09-24"),
        item("sat", "2026-09-26", { kind: "inspection", side: "property", at: "2026-09-26T09:00:00Z" }),
        item("sun", "2026-09-27"),
        item("past", "2026-09-20"),
      ],
      "2026-09-24",
    );
    expect(groups.today.map((i) => i.id)).toEqual(["today"]);
    expect(groups.week.map((i) => i.id)).toEqual(["sat", "sun"]);
    expect(groups.later.map((i) => i.id)).toEqual(["later"]);
    expect(planCount(groups)).toBe(4);
  });

  it("puts the edge of the week in This week and the day after in Later", () => {
    const groups = groupPlans([item("d6", "2026-09-30"), item("d7", "2026-10-01")], "2026-09-24");
    expect(groups.week.map((i) => i.id)).toEqual(["d6"]);
    expect(groups.later.map((i) => i.id)).toEqual(["d7"]);
  });

  it("reads the filter from the address, and the shell's side when it says nothing", () => {
    expect(planFilterFrom({}, "stays")).toEqual({ filter: "stays", inspectionsOnly: false });
    expect(planFilterFrom({ side: "all" }, "stays")).toEqual({ filter: "all", inspectionsOnly: false });
    expect(planFilterFrom({ kind: "inspection" }, "stays")).toEqual({ filter: "property", inspectionsOnly: true });
    expect(planFilterFrom({ side: "nonsense" }, "property").filter).toBe("property");
  });

  it("filters by side, and All keeps both", () => {
    expect(inFilter({ side: "property" }, "stays")).toBe(false);
    expect(inFilter({ side: "property" }, "all")).toBe(true);
  });

  it("dates an instant on the Lagos calendar", () => {
    expect(lagosDay("2026-09-24T23:30:00Z")).toBe("2026-09-25");
  });
});
