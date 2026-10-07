import { describe, expect, it } from "vitest";
import { offeredPlans, planStateFrom, type MemberPlanRow, type PlanRow } from "./pro-state";
import { PRO_COPY, PRO_PLAN_CARDS } from "./pro-copy";

const NOW = Date.parse("2026-10-07T12:00:00+01:00");
const FREE: PlanRow = {
  plan_key: "free",
  name: "Free",
  is_default: true,
  effective_from: "2026-10-05T23:00:00Z",
  effective_to: null,
};
const AGENT: PlanRow = { ...FREE, plan_key: "agent_pro", name: "Agent Pro", is_default: false };

describe("/pro plan state", () => {
  it("is the default plan's own name for a member holding nothing (every member on 7 October)", () => {
    expect(planStateFrom([], [FREE], NOW)).toEqual({ kind: "free", planName: "Free" });
  });

  it("never guesses Free when either read failed", () => {
    expect(planStateFrom(null, [FREE], NOW)).toEqual({ kind: "unknown" });
    expect(planStateFrom([], null, NOW)).toEqual({ kind: "unknown" });
  });

  it("is unknown when no default plan is in force, rather than inventing one", () => {
    expect(planStateFrom([], [{ ...FREE, effective_from: "2027-01-01T00:00:00Z" }], NOW)).toEqual({ kind: "unknown" });
  });

  it("is held for the member's own plan in force, with its end date", () => {
    const mine: MemberPlanRow[] = [
      { effective_from: "2026-10-01T00:00:00Z", effective_to: "2026-11-01T00:00:00Z", plan: { plan_key: "agent_pro", name: "Agent Pro", is_default: false } },
    ];
    expect(planStateFrom(mine, [FREE, AGENT], NOW)).toEqual({ kind: "held", planName: "Agent Pro", until: "2026-11-01T00:00:00Z" });
  });

  it("ignores an ended or future plan row and falls back to the default", () => {
    const mine: MemberPlanRow[] = [
      { effective_from: "2026-09-01T00:00:00Z", effective_to: "2026-10-01T00:00:00Z", plan: { plan_key: "agent_pro", name: "Agent Pro", is_default: false } },
      { effective_from: "2026-12-01T00:00:00Z", effective_to: null, plan: { plan_key: "agent_pro", name: "Agent Pro", is_default: false } },
    ];
    expect(planStateFrom(mine, [FREE], NOW)).toEqual({ kind: "free", planName: "Free" });
  });

  it("offers only non-default plans in force; none today", () => {
    expect(offeredPlans([FREE], NOW)).toEqual([]);
    expect(offeredPlans([FREE, AGENT], NOW)).toEqual(["Agent Pro"]);
    expect(offeredPlans(null, NOW)).toEqual([]);
  });
});

describe("/pro copy never states a price", () => {
  it("carries no naira figure, currency sign or per-month wording anywhere", () => {
    const text = JSON.stringify({ PRO_COPY, PRO_PLAN_CARDS });
    expect(text).not.toMatch(/₦|NGN|naira\s*\d|\d[\d,]*\s*\/\s*(mo|month|yr|year)|per month|a month/i);
  });
});
