import { describe, expect, it } from "vitest";
import { FUNNEL_STAGES, fixFor, fixText, funnelFrom, type FunnelRpcRow } from "./funnel";

function rows(mine: Partial<Record<string, number>>, compared = 5, median: number | null = 4): FunnelRpcRow[] {
  return FUNNEL_STAGES.map((stage) => ({ stage, mine: mine[stage] ?? 0, area_median: median, compared }));
}
const facts = { photoCount: 8, moveInStated: true, publishedDays: 30 };

describe("the per-listing funnel (V-73)", () => {
  it("reads the six stages in order, and nothing when a stage is missing", () => {
    const funnel = funnelFrom(rows({ seen: 40, opened: 12 }));
    expect(funnel?.rows.map((r) => r.stage)).toEqual([...FUNNEL_STAGES]);
    expect(funnel?.rows[0]).toEqual({ stage: "seen", mine: 40, median: 4 });
    expect(funnelFrom(rows({}).slice(0, 5))).toBeNull();
    expect(funnelFrom([])).toBeNull();
  });

  it("prints no median from fewer than three similar listings", () => {
    expect(funnelFrom(rows({}, 2))?.rows[0]?.median).toBeNull();
    expect(funnelFrom(rows({}, 5, null))?.rows[0]?.median).toBeNull();
  });

  it("chooses one fix, top down the funnel", () => {
    const f = (mine: Partial<Record<string, number>>, over = {}) =>
      fixFor(funnelFrom(rows(mine))!, { ...facts, ...over });
    expect(f({})?.key).toBe("not-seen");
    // Under a week live: no "nobody saw it" advice yet.
    expect(f({}, { publishedDays: 3 })).toBeNull();
    expect(f({ seen: 30 })).toEqual({ key: "not-opened", values: { seen: 30 } });
    expect(f({ seen: 200, opened: 180, saved: 0 }, { photoCount: 3 })).toEqual({
      key: "not-saved",
      values: { opened: 180, photos: 3 },
    });
    expect(f({ seen: 200, opened: 50, saved: 4 }, { moveInStated: false })?.key).toBe("no-enquiry");
    expect(f({ seen: 200, opened: 50, saved: 4, enquired: 5 })?.key).toBe("no-viewing");
    expect(f({ seen: 200, opened: 50, saved: 4, enquired: 5, booked: 2 })).toBeNull();
  });

  it("fills a fix sentence from its own numbers only", () => {
    expect(fixText("Opened by {opened}, saved by nobody. {nope}", { opened: 180 })).toBe(
      "Opened by 180, saved by nobody. {nope}",
    );
  });
});
