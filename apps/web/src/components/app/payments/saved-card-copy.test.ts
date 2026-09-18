import { describe, expect, it } from "vitest";
import { savedCardMoment } from "./saved-card-copy";

const MONEY = "₦1,250,000.00";

describe("what a saved-card payment says", () => {
  it("names the amount in every single state", () => {
    const phases = [
      { kind: "charging" as const },
      { kind: "charged" as const },
      { kind: "needs_hosted" as const, authorizationUrl: "https://checkout.example/x" },
      { kind: "failed" as const, message: "The card was declined." },
    ];
    for (const phase of phases) {
      expect(savedCardMoment(phase, MONEY).consequence).toContain(MONEY);
    }
  });

  it("carries a consequence line in every state, because that is the line that removes fear", () => {
    const phases = [
      { kind: "charging" as const },
      { kind: "charged" as const },
      { kind: "needs_hosted" as const, authorizationUrl: "https://x" },
      { kind: "failed" as const, message: "nope" },
    ];
    for (const phase of phases) {
      expect(savedCardMoment(phase, MONEY).consequence.length).toBeGreaterThan(40);
    }
  });

  it("puts a decline in the failed state, never in a pending or review one", () => {
    const moment = savedCardMoment({ kind: "failed", message: "Declined" }, MONEY);
    expect(moment.state).toBe("failed");
    expect(moment.state).not.toBe("pending");
    expect(moment.state).not.toBe("review");
  });

  it("tells somebody nothing was charged when it was not", () => {
    const moment = savedCardMoment({ kind: "failed", message: "Declined" }, MONEY);
    expect(moment.consequence).toMatch(/nothing has been charged/i);
  });

  it("does not paint the bank's authentication check as a failure", () => {
    const moment = savedCardMoment(
      { kind: "needs_hosted", authorizationUrl: "https://checkout.example/x" },
      MONEY,
    );
    expect(moment.state).toBe("review");
    expect(moment.state).not.toBe("failed");
    /* And it says the money has NOT moved, because it has not. */
    expect(moment.consequence).toMatch(/nothing has been charged yet/i);
  });

  it("gives the in-flight state a horizon and a promise that nothing is lost", () => {
    const moment = savedCardMoment({ kind: "charging" }, MONEY);
    expect(moment.state).toBe("pending");
    expect(moment.consequence).toMatch(/nothing is lost/i);
  });

  it("never says something went wrong", () => {
    const phases = [
      { kind: "charging" as const },
      { kind: "charged" as const },
      { kind: "needs_hosted" as const, authorizationUrl: "https://x" },
      { kind: "failed" as const, message: "x" },
    ];
    for (const phase of phases) {
      const moment = savedCardMoment(phase, MONEY);
      expect(`${moment.verdict} ${moment.consequence}`).not.toMatch(/something went wrong/i);
    }
  });

  it("keeps every verdict short enough to be a headline", () => {
    const phases = [
      { kind: "charging" as const },
      { kind: "charged" as const },
      { kind: "needs_hosted" as const, authorizationUrl: "https://x" },
      { kind: "failed" as const, message: "x" },
    ];
    for (const phase of phases) {
      const { verdict } = savedCardMoment(phase, MONEY);
      expect(verdict.length).toBeLessThanOrEqual(30);
      expect(verdict).not.toContain("!");
    }
  });
});
