import { describe, expect, it } from "vitest";
import { timelineSteps } from "./timeline";

describe("the transaction timeline, in sentences", () => {
  const events = [
    { kind: "payment_confirmed" as const, at: "2026-10-02T10:00:00Z", amountMinor: 90_000_00 },
    { kind: "agreement_approved" as const, at: "2026-10-01T09:00:00Z" },
    { kind: "settled_to_payee" as const, at: null },
  ];

  it("draws only what happened, in the order it happened", () => {
    const steps = timelineSteps(events, "payer", "en");
    expect(steps.map((s) => s.sentence)).toEqual([
      "Vallo approved the agreement, and payment opened.",
      "Our payment partner confirmed your payment of ₦90,000.",
    ]);
  });

  it("speaks to the payee from their side", () => {
    expect(timelineSteps(events, "payee", "en")[1]?.sentence).toBe("Our payment partner confirmed a payment of ₦90,000 to you.");
  });

  it("never prints a status name, a placeholder or a zero", () => {
    const steps = timelineSteps([{ kind: "refund_requested", at: "2026-10-03T10:00:00Z" }], "payer", "en");
    expect(steps[0]?.sentence).toBe("You asked for a refund.");
    for (const step of timelineSteps(events, "payer", "en")) {
      expect(step.sentence).not.toMatch(/[A-Z]{2,}_|\{|₦0\b/);
    }
  });

  it("marks a failure or a review for attention", () => {
    expect(timelineSteps([{ kind: "payment_failed", at: "2026-10-03T10:00:00Z" }], "payer", "en")[0]?.tone).toBe("attention");
  });
});
