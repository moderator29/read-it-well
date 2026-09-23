import { describe, expect, it } from "vitest";
import { formatHoldUntil, holdFromRows, isAccountHoldError, loadAccountHold } from "./account-hold";

const NOW = Date.parse("2026-09-24T10:00:00Z");

describe("holdFromRows", () => {
  it("is none for an empty list", () => {
    expect(holdFromRows([], NOW)).toEqual({ state: "none" });
  });
  it("ignores a hold that has already ended", () => {
    expect(holdFromRows([{ ends_at: "2026-09-24T09:59:59Z" }], NOW)).toEqual({ state: "none" });
  });
  it("returns the latest end among live holds", () => {
    expect(
      holdFromRows(
        [{ ends_at: "2026-09-24T12:00:00Z" }, { ends_at: "2026-09-25T09:00:00Z" }, { ends_at: 7 }],
        NOW,
      ),
    ).toEqual({ state: "held", until: "2026-09-25T09:00:00Z" });
  });
  it("is unknown, never none, when the answer is not a list", () => {
    expect(holdFromRows(null, NOW)).toEqual({ state: "unknown" });
  });
});

describe("isAccountHoldError", () => {
  it("recognises the trigger's refusal", () => {
    expect(isAccountHoldError({ message: "account_hold_active", code: "P0001" })).toBe(true);
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
      loadAccountHold(client({ data: [{ ends_at: "2026-09-25T10:00:00Z" }], error: null }), NOW),
    ).resolves.toEqual({ state: "held", until: "2026-09-25T10:00:00Z" });
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
