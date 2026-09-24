import { describe, expect, it } from "vitest";
import { formatHoldUntil, holdFromRows, isAccountHoldError, loadAccountHold } from "./account-hold";

const NOW = Date.parse("2026-09-24T10:00:00Z");

describe("holdFromRows", () => {
  it("is none for an empty list", () => {
    expect(holdFromRows([], NOW)).toEqual({ state: "none" });
  });
  it("ignores a hold that has already ended", () => {
    expect(holdFromRows([{ hold_until: "2026-09-24T09:59:59Z", reason: "not_me" }], NOW)).toEqual({ state: "none" });
  });
  it("returns the latest end among live holds", () => {
    expect(
      holdFromRows(
        [{ hold_until: "2026-09-24T12:00:00Z" }, { hold_until: "2026-09-25T09:00:00Z", reason: "not_me" }, { hold_until: 7 }],
        NOW,
      ),
    ).toEqual({ state: "held", until: "2026-09-25T09:00:00Z", reason: "not_me" });
  });
  it("reads any other reason, a support email change among them, as other", () => {
    expect(holdFromRows([{ hold_until: "2026-09-25T09:00:00Z", reason: "support_email_change" }], NOW)).toEqual({
      state: "held",
      until: "2026-09-25T09:00:00Z",
      reason: "other",
    });
  });
  it("is unknown, never none, when the answer is not a list", () => {
    expect(holdFromRows(null, NOW)).toEqual({ state: "unknown" });
  });
});

describe("isAccountHoldError", () => {
  it("recognises the audit trigger's refusal, by code or by its opening words", () => {
    expect(isAccountHoldError({ code: "RM050", message: "x" })).toBe(true);
    expect(isAccountHoldError("Money cannot leave this account until 25 September 2026, 03:14, because ...")).toBe(true);
  });
  it("does not mistake another plpgsql raise for it", () => {
    expect(isAccountHoldError({ message: "insufficient", code: "P0001" })).toBe(false);
    expect(isAccountHoldError(null)).toBe(false);
  });
});

describe("loadAccountHold", () => {
  const client = (answer: { data: unknown; error: unknown } | Error) => ({
    from: () => ({
      select: () => ({
        gt: async () => {
          if (answer instanceof Error) throw answer;
          return answer;
        },
      }),
    }),
  });

  it("reads a live hold", async () => {
    await expect(
      loadAccountHold(client({ data: [{ hold_until: "2026-09-25T10:00:00Z", reason: "not_me" }], error: null }), NOW),
    ).resolves.toEqual({ state: "held", until: "2026-09-25T10:00:00Z", reason: "not_me" });
  });
  it("is unknown on an error, and on a throw", async () => {
    await expect(loadAccountHold(client({ data: null, error: { message: "x" } }), NOW)).resolves.toEqual({
      state: "unknown",
    });
    await expect(loadAccountHold(client(new Error("down")), NOW)).resolves.toEqual({ state: "unknown" });
  });
});

describe("formatHoldUntil", () => {
  it("names the weekday and prints Lagos time", () => {
    /* 20:30 UTC is 21:30 in Lagos (UTC+1, no daylight saving). */
    const out = formatHoldUntil("2026-09-24T20:30:00Z", "en");
    expect(out).toContain("Thursday");
    expect(out).toContain("21:30");
  });
  it("prints nothing for an unparseable time", () => {
    expect(formatHoldUntil("nonsense", "en")).toBe("");
  });
});
