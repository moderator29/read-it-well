import { describe, expect, it } from "vitest";
import { MAX_MOVE_KOBO } from "../wallet/schema";
import { LARGE_PAYMENT_KOBO, payRoutes } from "./large-payment";

describe("payRoutes", () => {
  it("leaves an ordinary move-in alone", () => {
    expect(payRoutes(45_000_000)).toMatchObject({ leadWithTransfer: false, walletOffered: true });
  });

  it("leads with bank transfer above the threshold", () => {
    expect(payRoutes(LARGE_PAYMENT_KOBO)).toMatchObject({ leadWithTransfer: false });
    expect(payRoutes(LARGE_PAYMENT_KOBO + 1)).toMatchObject({ leadWithTransfer: true, walletOffered: true });
  });

  it("does not offer the wallet above its own ceiling", () => {
    expect(payRoutes(MAX_MOVE_KOBO)).toMatchObject({ walletOffered: true });
    expect(payRoutes(3_630_000_000)).toMatchObject({ leadWithTransfer: true, walletOffered: false });
  });

  it("treats a non-amount as nothing to route", () => {
    expect(payRoutes(Number.NaN)).toMatchObject({ leadWithTransfer: false, walletOffered: true });
  });
});
