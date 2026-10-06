import { describe, expect, it } from "vitest";
import { cardPaymentSteps } from "./payment-steps";

/**
 * Motion 14: a step ticks only when its phase has genuinely passed. These pin
 * that "opening" never shows anything done, that "settling" shows only the
 * window as done, and that "received" is never drawn done by this list (the
 * receipt replaces the sheet at that moment).
 */
const labels = { opening: "a", confirming: "b", received: "c" };

describe("cardPaymentSteps", () => {
  it("shows nothing done while the payment window is still opening", () => {
    expect(cardPaymentSteps("opening", labels).map((s) => s.state)).toEqual(["active", "waiting", "waiting"]);
  });

  it("ticks the window once it loaded, and confirms against our own record next", () => {
    expect(cardPaymentSteps("settling", labels).map((s) => s.state)).toEqual(["done", "active", "waiting"]);
  });

  it("never draws the payment as received", () => {
    for (const phase of ["opening", "settling"] as const) {
      expect(cardPaymentSteps(phase, labels).at(-1)?.state).toBe("waiting");
    }
  });
});
