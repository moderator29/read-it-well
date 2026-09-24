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

  it("withdraws only the top-up route above the ceiling", () => {
    expect(payRoutes(MAX_MOVE_KOBO)).toMatchObject({ walletOffered: true });
    expect(payRoutes(3_630_000_000)).toMatchObject({ leadWithTransfer: true, walletOffered: false });
  });

  it("always offers a wallet that already covers the total, whatever its size", () => {
    expect(payRoutes(3_630_000_000, 3_630_000_000)).toMatchObject({ walletOffered: true });
  });

  it("offers the top-up when only the shortfall fits under the ceiling", () => {
    expect(payRoutes(3_630_000_000, 3_000_000_000)).toMatchObject({ walletOffered: true });
    expect(payRoutes(3_630_000_000, 3_630_000_000 - MAX_MOVE_KOBO)).toMatchObject({ walletOffered: true });
    expect(payRoutes(3_630_000_000, 3_630_000_000 - MAX_MOVE_KOBO - 1)).toMatchObject({ walletOffered: false });
  });

  it("treats a non-amount as nothing to route", () => {
    expect(payRoutes(Number.NaN)).toMatchObject({ leadWithTransfer: false, walletOffered: true });
  });
});
