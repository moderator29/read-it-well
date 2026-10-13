import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  quoteCalls: [] as Record<string, unknown>[],
  quote: { data: null as unknown, error: null as unknown },
}));

vi.mock("../guard", () => ({
  requireAdmin: async () =>
    seam.access["state"] === "admin"
      ? {
          state: "admin",
          supabase: {
            from: (table: string) => ({
              select: () => {
                const rows =
                  table === "money_policy_versions"
                    ? [{ id: 1, version: "2026-10-06.1", effective_from: "2026-10-05T23:00:00Z", withdrawal_min_minor: 100000 }]
                    : [
                        { id: 2, from_minor: 10000000, to_minor: 50000000, flat_fee_minor: 20000, fee_bps: null, fee_cap_minor: null, confirmed: true },
                        { id: 1, from_minor: 100000, to_minor: 10000000, flat_fee_minor: 5000, fee_bps: null, fee_cap_minor: null, confirmed: true },
                        { id: 4, from_minor: 200000000, to_minor: null, flat_fee_minor: null, fee_bps: null, fee_cap_minor: null, confirmed: false },
                      ];
                const done = { data: rows, error: null };
                return {
                  is: () => ({ order: () => ({ limit: async () => done }) }),
                  eq: () => ({ order: async () => done }),
                };
              },
            }),
            rpc: async (_fn: string, args: Record<string, unknown>) => {
              seam.quoteCalls.push(args);
              return seam.quote;
            },
          },
        }
      : seam.access,
}));

const { nairaToMinor, parseQuote, parseSchedule } = await import("./withdrawal-fees");
const { readWithdrawalFees } = await import("./withdrawal-fees-read");

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.quoteCalls = [];
  seam.quote = { data: null, error: null };
});

describe("nairaToMinor", () => {
  it("reads naira the way a person types it, to kobo", () => {
    expect(nairaToMinor("250000")).toBe(25_000_000);
    expect(nairaToMinor("250,000")).toBe(25_000_000);
    expect(nairaToMinor("₦1,000.50")).toBe(100_050);
    expect(nairaToMinor("1000.5")).toBe(100_050);
  });
  it("refuses what is not an amount, and never rounds a half kobo", () => {
    for (const bad of ["", "abc", "-5", "0", "1.234", "1e5", "1 000 000 000 000 000"]) expect(nairaToMinor(bad), bad).toBeNull();
    expect(nairaToMinor(null)).toBeNull();
  });
});

describe("parseQuote", () => {
  it("reads an ok quote only when the figures add up", () => {
    expect(parseQuote({ status: "ok", amount_minor: 25_000_000, vallo_fee_minor: 20000 })).toEqual({ status: "ok", amountMinor: 25_000_000, feeMinor: 20000 });
    expect(parseQuote({ status: "ok", amount_minor: 100, vallo_fee_minor: 200 })).toEqual({ status: "unavailable" });
  });
  it("carries the database's reasons for no quote and treats anything else as unavailable", () => {
    expect(parseQuote({ status: "below_minimum", minimum_minor: 100000 })).toEqual({ status: "below_minimum", minimumMinor: 100000 });
    for (const status of ["no_band", "band_unconfirmed", "no_policy"]) expect(parseQuote({ status })).toEqual({ status });
    expect(parseQuote({ status: "mystery" })).toEqual({ status: "unavailable" });
    expect(parseQuote(null)).toEqual({ status: "unavailable" });
  });
});

describe("parseSchedule", () => {
  it("orders the bands by where they start and keeps the unconfirmed one unconfirmed", () => {
    const schedule = parseSchedule(
      { version: "v", effective_from: "2026-10-05T23:00:00Z", withdrawal_min_minor: 100000 },
      [
        { id: 4, from_minor: 200000000, to_minor: null, confirmed: false },
        { id: 1, from_minor: 100000, to_minor: 10000000, flat_fee_minor: 5000, confirmed: true },
      ],
    )!;
    expect(schedule.bands.map((b) => b.id)).toEqual([1, 4]);
    expect(schedule.bands[1]).toMatchObject({ confirmed: false, flatFeeMinor: null, toMinor: null });
  });
  it("refuses a schedule it cannot read", () => {
    expect(parseSchedule(null, [])).toBeNull();
    expect(parseSchedule({ version: "v", effective_from: "x", withdrawal_min_minor: "no" }, [])).toBeNull();
  });
});

describe("readWithdrawalFees", () => {
  it("reads the schedule in force and asks no quote when no amount is given", async () => {
    const read = await readWithdrawalFees(null);
    expect(read.state).toBe("ok");
    if (read.state === "ok") {
      expect(read.quote).toBeNull();
      expect(read.schedule.bands.map((b) => b.id)).toEqual([1, 2, 4]);
    }
    expect(seam.quoteCalls).toEqual([]);
  });

  it("asks the database's own function for the amount, in kobo", async () => {
    seam.quote = { data: { status: "ok", amount_minor: 25_000_000, vallo_fee_minor: 20000 }, error: null };
    const read = await readWithdrawalFees("250,000");
    expect(seam.quoteCalls).toEqual([{ p_amount_minor: 25_000_000 }]);
    expect(read.state === "ok" && read.quote?.answer).toEqual({ status: "ok", amountMinor: 25_000_000, feeMinor: 20000 });
  });

  it("does not ask the database about text that is not an amount", async () => {
    const read = await readWithdrawalFees("lots");
    expect(seam.quoteCalls).toEqual([]);
    expect(read.state === "ok" && read.quote?.answer).toEqual({ status: "bad" });
  });

  it("is forbidden outside the finance door", async () => {
    seam.access = { state: "not-admin" };
    expect(await readWithdrawalFees(null)).toEqual({ state: "forbidden" });
  });
});
