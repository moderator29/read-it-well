import { describe, expect, it } from "vitest";
import { preselectedCardId } from "./format";
import type { PaymentMethod } from "@/lib/payments/methods";

function card(id: string, over: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id,
    cardType: "visa",
    last4: "4081",
    expMonth: 12,
    expYear: 2030,
    bank: null,
    reusable: true,
    isDefault: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

describe("which saved card is offered first", () => {
  it("offers the default when it can be charged", () => {
    expect(preselectedCardId([card("a"), card("b", { isDefault: true })])).toBe("b");
  });

  it("falls to the first chargeable card when the default cannot be charged", () => {
    const cards = [
      card("dead", { isDefault: true, reusable: false }),
      card("alive"),
    ];
    expect(preselectedCardId(cards)).toBe("alive");
  });

  it("never offers an expired card, even when it is the default", () => {
    const cards = [
      card("old", { isDefault: true, expMonth: 1, expYear: 2020 }),
      card("current"),
    ];
    expect(preselectedCardId(cards)).toBe("current");
  });

  it("offers nothing when no card can be charged, so the caller draws no control", () => {
    expect(preselectedCardId([card("x", { reusable: false })])).toBeNull();
    expect(preselectedCardId([])).toBeNull();
  });
});
