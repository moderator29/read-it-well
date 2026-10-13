import { describe, expect, it } from "vitest";
import { FUND_CLOSED, FUND_OPEN_BALANCE, FUND_TOP_UP } from "./copy";
import { fundModel, type FundFacts } from "./fund-model";

const BASE: FundFacts = {
  viewerIsRenter: true,
  kind: "rent",
  agreementStatus: "approved",
  payable: "payable",
  rail: "escrow",
  railLive: true,
  arrangementStatus: null,
  amountMinor: 120_000_000,
  placeTitle: "Two-bedroom flat, Yaba",
  counterpartName: "Adaeze",
  moveIn: "2026-11-01",
  balance: { state: "ready", availableMinor: 150_000_000, confirmedAt: "2026-10-07T09:00:00Z", live: true },
};

describe("the renter's funding screen (D77)", () => {
  it("offers the swipe when the balance covers the rent, with nothing added for fees", () => {
    const m = fundModel(BASE);
    expect(m).toMatchObject({ kind: "fund", amountMinor: 120_000_000, availableMinor: 150_000_000, shortMinor: 0, cover: 1, ready: true, balanceAction: null });
  });

  it("short: says how much more, offers the top-up, holds the swipe back", () => {
    const m = fundModel({ ...BASE, balance: { state: "ready", availableMinor: 30_000_000, confirmedAt: null, live: true } });
    expect(m).toMatchObject({ kind: "fund", shortMinor: 90_000_000, cover: 0.25, ready: false, balanceAction: { label: FUND_TOP_UP, href: "/wallet" } });
  });

  it("no balance yet: opening it is the one action", () => {
    const m = fundModel({ ...BASE, balance: { state: "onboarding" } });
    expect(m).toMatchObject({ kind: "fund", availableMinor: null, ready: false, balanceAction: { label: FUND_OPEN_BALANCE } });
  });

  it("marks a figure Payluk could not refresh", () => {
    expect(fundModel({ ...BASE, balance: { state: "ready", availableMinor: 150_000_000, confirmedAt: null, live: false } })).toMatchObject({ balanceStale: true });
  });

  it("steps aside for the held screen once the money is on its way or held", () => {
    for (const s of ["payment_processing", "protected", "release_requested", "released", "disputed"]) {
      expect(fundModel({ ...BASE, arrangementStatus: s })).toEqual({ kind: "go_held" });
      expect(fundModel({ ...BASE, viewerIsRenter: false, arrangementStatus: s })).toEqual({ kind: "go_held" });
    }
    /* Awaiting payment is still this screen's to finish. */
    expect(fundModel({ ...BASE, arrangementStatus: "awaiting_payment" })).toMatchObject({ kind: "fund" });
  });

  it("closes, in one sentence each, whatever cannot be paid into escrow", () => {
    const cases: [Partial<FundFacts>, keyof typeof FUND_CLOSED][] = [
      [{ viewerIsRenter: false }, "not_renter"],
      [{ kind: "stay" }, "not_rent"],
      [{ agreementStatus: "in_review" }, "not_approved"],
      [{ rail: "direct" }, "direct"],
      [{ payable: "review_required" }, "review_required"],
      [{ payable: null }, "not_approved"],
      [{ rail: null }, "not_approved"],
      [{ railLive: false }, "not_live"],
      [{ balance: { state: "not-live" } }, "not_live"],
      [{ balance: { state: "error" } }, "balance_unreadable"],
    ];
    for (const [over, reason] of cases) {
      expect(fundModel({ ...BASE, ...over }), reason).toEqual({ kind: "closed", reason, body: FUND_CLOSED[reason] });
    }
  });
});
