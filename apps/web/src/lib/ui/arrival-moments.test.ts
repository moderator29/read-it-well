import { describe, expect, it } from "vitest";
import { approvedRecently } from "./recent-approval";
import { agreementArrival, listingArrival } from "./arrival-moments";

/**
 * The pages that show a success moment on arrival (docs/SUCCESS_MOMENTS.md):
 * the flag asks and the record answers. Every "null" here is a sheet that
 * must not open.
 */
const agreement = (over: Partial<Parameters<typeof agreementArrival>[0]> = {}) => ({
  role: "renter" as string | null,
  status: "awaiting_parties",
  youConfirmedCurrent: false,
  claims: [] as { mine: boolean; status: string }[],
  ...over,
});

describe("agreementArrival", () => {
  it("drawn up: shown to a party of an agreement still awaiting the parties", () => {
    expect(agreementArrival(agreement(), "agreement-drawn")).toEqual({ moment: "agreementDrawn", seenOnce: false });
    expect(agreementArrival(agreement({ role: null }), "agreement-drawn")).toBeNull();
    expect(agreementArrival(agreement({ status: "cancelled" }), "agreement-drawn")).toBeNull();
  });

  it("confirmed: 'in review' once both confirmed, 'confirmed' when only you have, nothing when you have not", () => {
    expect(agreementArrival(agreement({ status: "in_review" }), "agreement-confirmed")?.moment).toBe("agreementInReview");
    expect(agreementArrival(agreement({ youConfirmedCurrent: true }), "agreement-confirmed")?.moment).toBe("agreementConfirmed");
    expect(agreementArrival(agreement(), "agreement-confirmed")).toBeNull();
  });

  it("claim filed: only when a claim of yours is on file", () => {
    const filed = agreement({ status: "paid", claims: [{ mine: true, status: "submitted" }] });
    expect(agreementArrival(filed, "claim-filed")?.moment).toBe("claimFiled");
    expect(agreementArrival(agreement({ status: "paid", claims: [{ mine: false, status: "submitted" }] }), "claim-filed")).toBeNull();
  });

  it("approved: from the status, once per device, in each party's own words", () => {
    expect(agreementArrival(agreement({ status: "approved" }), null)).toEqual({ moment: "agreementApprovedRenter", seenOnce: true });
    expect(agreementArrival(agreement({ status: "approved", role: "owner" }), null)?.moment).toBe("agreementApprovedOwner");
    expect(agreementArrival(agreement({ status: "in_review" }), null)).toBeNull();
    expect(agreementArrival(agreement({ status: "rejected" }), null)).toBeNull();
  });
});

describe("listingArrival", () => {
  const mine = [
    { id: "l-review", status: "UNDER_REVIEW" },
    { id: "l-approved", status: "APPROVED" },
    { id: "l-live", status: "PUBLISHED" },
    { id: "l-rejected", status: "REJECTED" },
  ];

  it("names the moment only when the listing is yours and its status says so", () => {
    expect(listingArrival(mine, "listing-submitted", "l-review")).toBe("listingSubmitted");
    expect(listingArrival(mine, "listing-approved", "l-approved")).toBe("listingApproved");
    expect(listingArrival(mine, "listing-live", "l-live")).toBe("listingLive");
  });

  it("opens nothing for a status that does not match, somebody else's listing or no flag", () => {
    expect(listingArrival(mine, "listing-live", "l-approved")).toBeNull();
    expect(listingArrival(mine, "listing-approved", "l-rejected")).toBeNull();
    expect(listingArrival(mine, "listing-live", "not-mine")).toBeNull();
    expect(listingArrival(mine, null, "l-live")).toBeNull();
  });
});

describe("approvedRecently", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  it("is news for a fortnight after a passed decision, and never for a failed one", () => {
    expect(approvedRecently([{ status: "passed", decidedAt: "2026-09-28T09:00:00Z" }], now)).toBe(true);
    expect(approvedRecently([{ status: "passed", decidedAt: "2026-08-01T09:00:00Z" }], now)).toBe(false);
    expect(approvedRecently([{ status: "failed", decidedAt: "2026-09-28T09:00:00Z" }], now)).toBe(false);
    expect(approvedRecently([{ status: "passed", decidedAt: "not a date" }], now)).toBe(false);
  });
});
