import { describe, expect, it } from "vitest";

import { chargeOfferFrom, inspectionIsAccepted, type ChargeOfferFacts } from "./charge-offer";

const BASE: ChargeOfferFacts = {
  viewerIsLister: false,
  listingId: "ed000000-0000-4000-8000-000000000001",
  listingIsTenancy: true,
  inspection: null,
  charge: null,
};

describe("the real charge on the account card", () => {
  it("offers to pay the move-in total when the renter's inspection is accepted and the charge is open", () => {
    expect(
      chargeOfferFrom({
        ...BASE,
        inspection: { id: "i1", state: "CONFIRMED", outcome: null },
        charge: { totalMinor: 420_000_000, currency: "NGN", paid: false },
      }),
    ).toEqual({ kind: "pay", inspectionId: "i1", totalMinor: 420_000_000, currency: "NGN" });
  });

  it("asks for an inspection first when there is none, or it is not accepted yet", () => {
    expect(chargeOfferFrom(BASE)).toEqual({ kind: "request", listingId: BASE.listingId });
    expect(
      chargeOfferFrom({ ...BASE, inspection: { id: "i1", state: "REQUESTED", outcome: null } }),
    ).toEqual({ kind: "request", listingId: BASE.listingId });
    expect(
      chargeOfferFrom({ ...BASE, inspection: { id: "i1", state: "COMPLETED", outcome: "no_deal" } }),
    ).toEqual({ kind: "request", listingId: BASE.listingId });
  });

  it("offers nothing to the lister, on a sale or a stay, or once it is paid", () => {
    expect(chargeOfferFrom({ ...BASE, viewerIsLister: true })).toEqual({ kind: "none" });
    expect(chargeOfferFrom({ ...BASE, listingIsTenancy: false })).toEqual({ kind: "none" });
    expect(chargeOfferFrom({ ...BASE, listingId: null })).toEqual({ kind: "none" });
    expect(
      chargeOfferFrom({
        ...BASE,
        inspection: { id: "i1", state: "CONFIRMED", outcome: null },
        charge: { totalMinor: 420_000_000, currency: "NGN", paid: true },
      }),
    ).toEqual({ kind: "none" });
  });

  it("offers nothing when an accepted inspection has no charge the pay page can open", () => {
    expect(
      chargeOfferFrom({ ...BASE, inspection: { id: "i1", state: "CONFIRMED", outcome: null }, charge: null }),
    ).toEqual({ kind: "none" });
  });

  it("uses the pay page's own rule for accepted", () => {
    expect(inspectionIsAccepted("CONFIRMED", null)).toBe(true);
    expect(inspectionIsAccepted("COMPLETED", null)).toBe(true);
    expect(inspectionIsAccepted("COMPLETED", "no_deal")).toBe(false);
    expect(inspectionIsAccepted("PROPOSED", null)).toBe(false);
  });
});
