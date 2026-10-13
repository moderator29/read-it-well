import { describe, expect, it } from "vitest";
import { BUSINESS_RUNGS, ladderView } from "@/lib/admin/business-ladder";
import { businessTierItems } from "./business-tiers";
import { materialForStep } from "./fan-pose";

/**
 * The host ladder's credentials say "held" only for what the database's tier
 * grants: a rung passed above a gap is not held, whatever its own row says.
 */
describe("a host business's tiers as credentials", () => {
  it("holds the rungs at or under the tier, in ladder order, in the ladder's own words", () => {
    const rungs = ladderView([
      { rung: "identity", status: "passed", note: null, decidedAt: "2026-10-01T00:00:00Z" },
      { rung: "registration", status: "passed", note: null, decidedAt: "2026-10-02T00:00:00Z" },
    ]);
    const items = businessTierItems({ tier: 2, rungs });
    expect(items.map((item) => item.step)).toEqual([1, 2, 3, 4]);
    expect(items.map((item) => item.held)).toEqual([true, true, false, false]);
    expect(items[0]?.meaning).toBe(rungs[0]?.guestMeaning);
    expect(items).toHaveLength(BUSINESS_RUNGS.length);
  });

  it("does not call a rung held when it was passed above a gap", () => {
    const rungs = ladderView([{ rung: "on_site", status: "passed", note: null, decidedAt: "2026-10-01T00:00:00Z" }]);
    expect(rungs[3]?.stranded).toBe(true);
    expect(businessTierItems({ tier: 0, rungs }).some((item) => item.held)).toBe(false);
  });

  it("gives the top rung the warm edge and the one below it royal, as the agent ladder does", () => {
    expect([1, 2, 3, 4].map((step) => materialForStep(step, 4))).toEqual(["navy", "navy", "royal", "edge"]);
  });
});
