import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { holdReasonOf, notMeConsequence, type NotMeOutcome } from "./not-me-copy";

vi.mock("../locale", () => ({ getLocale: async () => "en" }));

const copy = getDictionary("en").platform.notMe;
const TEN_YEARS = new Date(Date.now() + 10 * 365 * 86_400_000).toISOString();
const base: NotMeOutcome = { holdUntil: TEN_YEARS, holdPlaced: false, holdExtended: false, holdReason: "plain", rateLimited: false };

/* The words a member would read, with every placeholder filled the way the panel fills it. */
const said = (sentence: string) => sentence.replace("{until}", "25 September 2036, 10:00").replace("{ended}", "We signed out 1 other device.");

describe("this was not me, over a plain hold (no tipping off, SCUML items 6 and 8)", () => {
  it("reads the reason code back as plain, and anything unknown as other", () => {
    expect(holdReasonOf("plain")).toBe("plain");
    expect(holdReasonOf("not_me")).toBe("not_me");
    expect(holdReasonOf("support_email_change")).toBe("other");
    expect(holdReasonOf(null)).toBeNull();
  });

  it("tells a member with a plain hold nothing about a date, a cause, a review or a check", () => {
    for (const outcome of [base, { ...base, rateLimited: true }]) {
      const sentence = notMeConsequence(outcome, copy);
      expect(sentence).not.toContain("{until}");
      const words = said(sentence);
      expect(words).not.toMatch(/2036|until|review|check|compliance|staff|support|sanction/i);
      expect(words).toMatch(/hold/i);
    }
  });

  it("still gives the member's own hold its end, and a support hold its sentence", () => {
    expect(notMeConsequence({ ...base, holdReason: "not_me" }, copy)).toContain("{until}");
    expect(notMeConsequence({ ...base, holdReason: "other" }, copy)).toBe(copy.alreadyHeldOtherConsequence);
  });
});

describe("the refusal a member with a plain hold is given", () => {
  it("names no cause and no date", async () => {
    const { accountHoldRefusal } = await import("./account-hold-guard");
    const client = {
      from: () => ({
        select: () => ({ gt: async () => ({ data: [{ hold_until: TEN_YEARS, reason: "plain" }], error: null }) }),
      }),
    };
    const refusal = await accountHoldRefusal(client);
    expect(refusal).toBe(getDictionary("en").platform.hold.refusalPlain);
    expect(refusal).not.toMatch(/20\d\d|until|review|check|compliance|staff|support|sanction/i);
  });
});
