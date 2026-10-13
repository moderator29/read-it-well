import { describe, expect, it } from "vitest";
import { FUND_CLOSED, FUND_STEPS, FUND_STEPS_STAY } from "./copy";
import { fundModel, type FundFacts } from "./fund-model";

/* Ruling 2 (13 October 2026): a shortlet stay at a listing is paid into
   escrow by default, so the escrow step serves it; a hotel room is card only
   and the step stays closed for it. */
const RENT: FundFacts = {
  viewerIsRenter: true,
  kind: "rent",
  agreementStatus: "approved",
  payable: "payable",
  rail: "escrow",
  railLive: true,
  arrangementStatus: null,
  amountMinor: 40_000_00,
  placeTitle: "Studio, Wuse",
  counterpartName: "Host",
  moveIn: "2026-11-01",
  balance: { state: "ready", availableMinor: 50_000_00, confirmedAt: null, live: true },
};

describe("the escrow step for a stay", () => {
  it("opens for a stay at a listing, in a guest's words", () => {
    const model = fundModel({ ...RENT, kind: "stay", listingStay: true });
    expect(model.kind).toBe("fund");
    expect(model.kind === "fund" ? model.steps : null).toBe(FUND_STEPS_STAY);
  });

  it("stays closed for a hotel room (card only)", () => {
    expect(fundModel({ ...RENT, kind: "stay", listingStay: false })).toEqual({ kind: "closed", reason: "not_rent", body: FUND_CLOSED.not_rent });
    expect(fundModel({ ...RENT, kind: "stay" })).toMatchObject({ kind: "closed", reason: "not_rent" });
  });

  it("closes when the payer chose card", () => {
    expect(fundModel({ ...RENT, kind: "stay", listingStay: true, rail: "direct" })).toMatchObject({ kind: "closed", reason: "direct" });
  });

  it("keeps the rental's own steps for a rental", () => {
    const model = fundModel(RENT);
    expect(model.kind === "fund" ? model.steps : null).toBe(FUND_STEPS);
  });
});
