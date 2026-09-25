import { describe, expect, it } from "vitest";
import { LARGE_PAYMENT_KOBO, payRoutes } from "./large-payment";

describe("payRoutes", () => {
  it("leaves an ordinary move-in alone", () => {
    expect(payRoutes(45_000_000)).toEqual({ leadWithTransfer: false });
  });

  it("leads with bank transfer above the threshold", () => {
    expect(payRoutes(LARGE_PAYMENT_KOBO)).toEqual({ leadWithTransfer: false });
    expect(payRoutes(LARGE_PAYMENT_KOBO + 1)).toEqual({ leadWithTransfer: true });
    expect(payRoutes(3_630_000_000)).toEqual({ leadWithTransfer: true });
  });

  it("offers no wallet route at any size: Vallo holds no money", () => {
    expect(Object.keys(payRoutes(3_630_000_000))).toEqual(["leadWithTransfer"]);
  });

  it("treats a non-amount as nothing to route", () => {
    expect(payRoutes(Number.NaN)).toEqual({ leadWithTransfer: false });
  });
});
