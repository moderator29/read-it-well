import { describe, expect, it } from "vitest";
import { readPaidRow } from "./paid-prices";

const good = {
  property_type: "apartment", bedrooms: 2, tenancy_band: "5-9",
  p25_minor: 325000000, median_minor: "350000000", p75_minor: 375000000,
  median_fee_share_bps: 1500, oldest_at: "2026-09-01T00:00:00Z", newest_at: "2026-10-01T00:00:00Z",
};

describe("readPaidRow", () => {
  it("reads a row the database let through", () => {
    expect(readPaidRow(good)).toMatchObject({ tenancyBand: "5-9", medianMinor: 350_000_000, feeShareBps: 1500 });
  });
  it("refuses a row that carries an exact count or an unknown band", () => {
    expect(readPaidRow({ ...good, tenancy_band: undefined, tenancy_count: 6 })).toBeNull();
    expect(readPaidRow({ ...good, tenancy_band: "4" })).toBeNull();
  });
  it("reads the upper band", () => {
    expect(readPaidRow({ ...good, tenancy_band: "10+" })?.tenancyBand).toBe("10+");
  });
  it("refuses quartiles out of order or fractional", () => {
    expect(readPaidRow({ ...good, p25_minor: 400000000 })).toBeNull();
    expect(readPaidRow({ ...good, median_minor: 1.5 })).toBeNull();
  });
  it("keeps a row with no fee share, as null", () => {
    expect(readPaidRow({ ...good, median_fee_share_bps: null })?.feeShareBps).toBeNull();
  });
});
