import { describe, expect, it } from "vitest";
import { bulkSummary, planBulk, rangeToggle } from "./bulk";

const rows = [
  { id: "a", status: "PUBLISHED" as const, intent: "rent" },
  { id: "b", status: "PUBLISHED" as const, intent: "sale" },
  { id: "c", status: "DRAFT" as const, intent: "rent" },
  { id: "d", status: "SUBMITTED" as const, intent: "rent" },
  { id: "e", status: "MORE_INFO_REQUIRED" as const, intent: "stay" },
];

describe("agent bulk actions (C5)", () => {
  it("offers each action only to the listings it can apply to", () => {
    expect(planBulk(rows, ["a", "b", "c", "d", "e"])).toEqual({ confirm: ["a", "b"], takeDown: ["b"], submit: ["c", "e"] });
    expect(planBulk(rows, [])).toEqual({ confirm: [], takeDown: [], submit: [] });
  });
  it("selects a range with shift, in screen order, and clears one the same way", () => {
    const order = ["a", "b", "c", "d", "e"];
    expect(rangeToggle(order, ["a"], "a", "d", true)).toEqual(["a", "b", "c", "d"]);
    expect(rangeToggle(order, ["a", "b", "c", "d"], "d", "b", false)).toEqual(["a"]);
    expect(rangeToggle(order, [], null, "c", true)).toEqual(["c"]);
  });
  it("sums up what happened", () => {
    expect(bulkSummary(3, [])).toBe("3 done.");
    expect(bulkSummary(2, ["Refresh to see where this one stands.", "x"])).toBe("2 done. 2 could not: Refresh to see where this one stands.");
  });
});
