import { describe, expect, it } from "vitest";
import { hasEntitlement } from "../entitlements/check";
import { parseTaxLine, readTaxLine } from "./schedule";

describe("tax lines", () => {
  it("an unconfirmed rate is absent, not zero", () => {
    expect(parseTaxLine({ status: "unconfirmed", schedule_line_id: 1 })).toEqual({ show: false, reason: "unconfirmed" });
    expect(parseTaxLine({ status: "not_registered" })).toEqual({ show: false, reason: "not_registered" });
  });
  it("shows only a confirmed integer rate", () => {
    expect(parseTaxLine({ status: "ok", schedule_line_id: 3, rate_bps: 750, borne_by: "lister" })).toEqual({
      show: true,
      scheduleLineId: 3,
      rateBps: 750,
      borneBy: "lister",
    });
    expect(parseTaxLine({ status: "ok", schedule_line_id: 3, rate_bps: 7.5 }).show).toBe(false);
  });
  it("an error reads as no line", async () => {
    const db = { rpc: async () => ({ data: null, error: { message: "x" } }) };
    expect(await readTaxLine(db, "stamp_duty_tenancy")).toEqual({ show: false, reason: "unreadable" });
  });
});

describe("entitlements fail closed", () => {
  it("true only on a literal true", async () => {
    expect(await hasEntitlement({ rpc: async () => ({ data: true, error: null }) }, "u", "listing_create")).toBe(true);
    expect(await hasEntitlement({ rpc: async () => ({ data: "true", error: null }) }, "u", "listing_create")).toBe(false);
    expect(await hasEntitlement({ rpc: async () => ({ data: true, error: {} }) }, "u", "listing_create")).toBe(false);
    expect(await hasEntitlement({ rpc: async () => ({ data: true, error: null }) }, "", "listing_create")).toBe(false);
  });
});
