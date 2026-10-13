import { describe, expect, it } from "vitest";
import { paidPlansFrom, planStateFrom, trialDaysFrom, type MemberPlanRow, type PlanFeatureRow, type PlanRow } from "./pro-state";
import { PRO_COPY, PRO_PLAN_WORDS } from "./pro-copy";

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

});

/* The rows as migration d84 seeds them (D83, 8 October). */
const PRO: PlanRow = {
  id: 2, plan_key: "pro", name: "Vallo Pro", is_default: false, effective_from: "2026-10-07T23:00:00Z", effective_to: null,
  price_minor: 950_000, billing_interval: "month", perks: ["deep_analytics", "pro_badge", "priority_support"],
};
const BUSINESS: PlanRow = {
  id: 3, plan_key: "business", name: "Vallo Business", is_default: false, effective_from: "2026-10-07T23:00:00Z", effective_to: null,
  price_minor: 3_500_000, billing_interval: "month", perks: ["team_members", "command_centre", "bulk_tools", "export"],
};
const FEATURES: PlanFeatureRow[] = [
  { plan_id: 2, feature_key: "listing_create", granted: true, quota: null },
  { plan_id: 2, feature_key: "listing_boost", granted: true, quota: 4 },
  { plan_id: 2, feature_key: "listing_spotlight", granted: false, quota: null },
  { plan_id: 3, feature_key: "listing_boost", granted: false, quota: null },
  { plan_id: 3, feature_key: "listing_spotlight", granted: true, quota: 2 },
  { plan_id: 3, feature_key: "listing_featured", granted: true, quota: 1 },
];
const AFTER = Date.parse("2026-10-09T12:00:00+01:00");

describe("/pro paid plans, read from the rows", () => {
  it("draws Pro and Business, cheapest first, with their price, quotas and perks", () => {
    expect(paidPlansFrom([FREE, BUSINESS, PRO], FEATURES, AFTER)).toEqual([
      { key: "pro", name: "Vallo Pro", priceMinor: 950_000, interval: "month",
        quotas: [{ key: "listing_boost", count: 4 }], perks: ["deep_analytics", "pro_badge", "priority_support"] },
      { key: "business", name: "Vallo Business", priceMinor: 3_500_000, interval: "month",
        quotas: [{ key: "listing_spotlight", count: 2 }, { key: "listing_featured", count: 1 }],
        perks: ["team_members", "command_centre", "bulk_tools", "export"] },
    ]);
  });

  it("leaves out the default plan, a plan with no price (before the migration), and a plan not in force", () => {
    expect(paidPlansFrom([FREE], FEATURES, AFTER)).toEqual([]);
    expect(paidPlansFrom([{ ...FREE, plan_key: "agent_pro", name: "Agent Pro", is_default: false }], FEATURES, AFTER)).toEqual([]);
    expect(paidPlansFrom([PRO], FEATURES, NOW)).toEqual([]);
    expect(paidPlansFrom([{ ...PRO, billing_interval: "year" }], FEATURES, AFTER)).toEqual([]);
    expect(paidPlansFrom(null, FEATURES, AFTER)).toEqual([]);
  });

  it("skips a perk it has no words for, never inventing one", () => {
    const [plan] = paidPlansFrom([{ ...PRO, perks: ["pro_badge", "free_lunch"] }], FEATURES, AFTER);
    expect(plan!.perks).toEqual(["pro_badge"]);
    for (const k of plan!.perks) expect(PRO_COPY.perks[k]).toBeDefined();
  });

  it("reads the trial length from the settings row, and says nothing when it cannot", () => {
    expect(trialDaysFrom({ trial_days: 4 })).toBe(4);
    expect(trialDaysFrom(null)).toBeNull();
    expect(trialDaysFrom({ trial_days: 0 })).toBeNull();
    expect(trialDaysFrom({ trial_days: "4" })).toBeNull();
  });
});

describe("/pro copy never states a figure of its own", () => {
  it("carries no naira figure or currency sign: the price, quotas and trial come from the rows", () => {
    const text = JSON.stringify({ PRO_COPY, PRO_PLAN_WORDS });
    expect(text).not.toMatch(/₦|NGN|naira\s*\d/i);
    expect(text.replace(/\{(price|count|days)\}/g, "")).not.toMatch(/\d+\s*(-day|day|days|Boost|Spotlight|Featured)\b/);
  });
});
