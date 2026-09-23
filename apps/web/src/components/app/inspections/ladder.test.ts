import { describe, expect, it } from "vitest";
import { canReport, ladderCount, ladderFor } from "./ladder";

describe("the inspection ladder", () => {
  it("starts on the first rung for a fresh request", () => {
    const rungs = ladderFor({ state: "REQUESTED", outcome: null });
    expect(rungs.map((r) => r.done)).toEqual([true, false, false, false]);
    expect(ladderCount(rungs)).toEqual({ done: 1, total: 4 });
  });

  it("does not count an offered time as agreed", () => {
    expect(ladderFor({ state: "PROPOSED", outcome: null })[1]?.done).toBe(false);
  });

  it("climbs to agreed on CONFIRMED and to visited on COMPLETED", () => {
    expect(ladderCount(ladderFor({ state: "CONFIRMED", outcome: null })).done).toBe(2);
    expect(ladderCount(ladderFor({ state: "COMPLETED", outcome: null })).done).toBe(3);
  });

  it("only records the last rung when an outcome was written", () => {
    expect(ladderCount(ladderFor({ state: "COMPLETED", outcome: "deal_done" })).done).toBe(4);
  });

  it("keeps a declined request on the rung it reached", () => {
    expect(ladderCount(ladderFor({ state: "DECLINED", outcome: null })).done).toBe(1);
  });

  it("only lets a report go while the inspection is agreed", () => {
    expect(canReport("CONFIRMED")).toBe(true);
    expect(canReport("REQUESTED")).toBe(false);
    expect(canReport("COMPLETED")).toBe(false);
  });
});
