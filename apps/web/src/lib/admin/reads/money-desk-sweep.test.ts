import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseSweepDesk } from "./money-desk-sweep";

describe("parseSweepDesk", () => {
  it("keeps a balance never read as null, not zero", () => {
    const d = parseSweepDesk({ status: "ok", balance: null, last_run: null, recent: [] });
    expect(d).toMatchObject({ state: "ok", balance: null, lastRun: null });
  });
  it("reads the balance and runs in kobo", () => {
    const d = parseSweepDesk({
      status: "ok",
      balance: { main_minor: 123450, escrow_minor: 0, currency: "NGN", read_at: "2026-10-06T10:00:00Z" },
      last_run: { started_at: "2026-10-06T10:00:00Z", outcome: "withdrawal_unavailable", main_balance_minor: 123450 },
      last_failure: { started_at: "2026-10-05T10:00:00Z", outcome: "failed", error_code: "http_429" },
      recent: [{ started_at: "x", outcome: "failed" }, { bad: true }],
    });
    if (d.state !== "ok") throw new Error("expected ok");
    expect(d.balance?.mainMinor).toBe(123450);
    expect(d.lastFailure?.errorCode).toBe("http_429");
    expect(d.recent).toHaveLength(1);
  });
  it("forbidden and garbage are distinct states", () => {
    expect(parseSweepDesk({ status: "forbidden" })).toEqual({ state: "forbidden" });
    expect(parseSweepDesk(null)).toEqual({ state: "unavailable" });
  });
});
