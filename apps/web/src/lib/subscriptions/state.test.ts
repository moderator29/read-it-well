import { describe, expect, it } from "vitest";
import { planOfferFor, subscriptionViewFrom, type SubscriptionRow } from "./state";

const NOW = Date.parse("2026-10-09T12:00:00Z");

function row(over: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    plan_key: "pro",
    kind: "paid",
    status: "active",
    amount_minor: 950000,
    currency: "NGN",
    checkout_reference: "rm-sub-00000000-0000-4000-8000-000000000001",
    trial_ends_at: null,
    current_period_end: "2026-11-08T10:00:00Z",
    cancel_requested_at: null,
    created_at: "2026-10-08T10:00:00Z",
    plan: { name: "Vallo Pro" },
    ...over,
  };
}

describe("subscriptionViewFrom", () => {
  it("is null when the read failed, so nothing is offered to somebody who may hold a plan", () => {
    expect(subscriptionViewFrom(null, NOW)).toBeNull();
  });

  it("is a fresh member with no rows", () => {
    expect(subscriptionViewFrom([], NOW)).toEqual({ trialUsed: false, live: null });
  });

  it("reads a running trial with its end", () => {
    const view = subscriptionViewFrom([row({ kind: "trial", status: "trialing", amount_minor: null, trial_ends_at: "2026-10-12T10:00:00Z" })], NOW);
    expect(view).toEqual({
      trialUsed: true,
      live: { kind: "trial", id: expect.any(String), planKey: "pro", planName: "Vallo Pro", trialEndsAt: "2026-10-12T10:00:00Z" },
    });
  });

  it("does not show a trial past its end as live, even before the sweep has moved it", () => {
    const view = subscriptionViewFrom([row({ kind: "trial", status: "trialing", amount_minor: null, trial_ends_at: "2026-10-09T11:00:00Z" })], NOW);
    expect(view).toEqual({ trialUsed: true, live: null });
  });

  it("reads a paid plan with the amount and period end from the row", () => {
    const view = subscriptionViewFrom(
      [row({ kind: "trial", status: "converted", amount_minor: null, trial_ends_at: "2026-10-12T10:00:00Z", created_at: "2026-10-07T10:00:00Z" }), row({})],
      NOW,
    );
    expect(view?.trialUsed).toBe(true);
    expect(view?.live).toMatchObject({ kind: "paid", status: "active", amountMinor: 950000, periodEnd: "2026-11-08T10:00:00Z" });
  });

  it("keeps a cancelled plan live to the end of its period, and not after", () => {
    expect(subscriptionViewFrom([row({ status: "non_renewing" })], NOW)?.live).toMatchObject({ status: "non_renewing" });
    expect(subscriptionViewFrom([row({ status: "non_renewing", current_period_end: "2026-10-01T00:00:00Z" })], NOW)?.live).toBeNull();
  });

  it("never shows an unfinished, abandoned or mismatched checkout as a plan", () => {
    for (const status of ["incomplete", "abandoned", "mismatch", "cancelled", "expired"] as const) {
      expect(subscriptionViewFrom([row({ status })], NOW)?.live, status).toBeNull();
    }
  });
});

describe("planOfferFor", () => {
  const base = { planKey: "pro", signedIn: true, trialOpen: true, payOpen: true, trialDays: 4, view: { trialUsed: false, live: null } };

  it("offers the trial and subscribing to a fresh member", () => {
    expect(planOfferFor(base)).toEqual({ kind: "buy", trial: true, inTrial: false, canPay: true });
  });

  it("asks a visitor to sign in, unless everything is closed", () => {
    expect(planOfferFor({ ...base, signedIn: false, view: null })).toEqual({ kind: "sign-in" });
    expect(planOfferFor({ ...base, signedIn: false, view: null, trialOpen: false, payOpen: false })).toEqual({ kind: "closed" });
  });

  it("is closed when the switch is off, and unknown when the rows could not be read", () => {
    expect(planOfferFor({ ...base, trialOpen: false, payOpen: false })).toEqual({ kind: "closed" });
    expect(planOfferFor({ ...base, view: null })).toEqual({ kind: "unknown" });
  });

  it("offers no second trial, and no trial while one runs", () => {
    expect(planOfferFor({ ...base, view: { trialUsed: true, live: null } })).toEqual({ kind: "buy", trial: false, inTrial: false, canPay: true });
    expect(
      planOfferFor({
        ...base,
        view: { trialUsed: true, live: { kind: "trial", id: "x", planKey: "business", planName: "Vallo Business", trialEndsAt: "2026-10-12T10:00:00Z" } },
      }),
    ).toEqual({ kind: "buy", trial: false, inTrial: true, canPay: true });
  });

  it("offers no trial without a trial length", () => {
    expect(planOfferFor({ ...base, trialDays: null })).toEqual({ kind: "buy", trial: false, inTrial: false, canPay: true });
  });

  it("offers the trial alone when Paystack cannot take a payment, and nothing when there is nothing to offer", () => {
    expect(planOfferFor({ ...base, payOpen: false })).toEqual({ kind: "buy", trial: true, inTrial: false, canPay: false });
    expect(planOfferFor({ ...base, payOpen: false, view: { trialUsed: true, live: null } })).toEqual({ kind: "closed" });
  });

  it("sells nothing to a member who already pays", () => {
    const live = { kind: "paid" as const, id: "x", planKey: "pro", planName: "Vallo Pro", status: "active" as const, periodEnd: null, amountMinor: 950000 };
    expect(planOfferFor({ ...base, view: { trialUsed: true, live } })).toEqual({ kind: "subscribed", planName: "Vallo Pro", same: true });
    expect(planOfferFor({ ...base, planKey: "business", view: { trialUsed: true, live } })).toEqual({ kind: "subscribed", planName: "Vallo Pro", same: false });
  });
});
