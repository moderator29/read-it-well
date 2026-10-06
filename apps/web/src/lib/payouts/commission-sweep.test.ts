import { describe, expect, it, vi } from "vitest";
import { sweepPaylukCommission, type SweepRow } from "./commission-sweep";
import { nairaToKobo, paylukMerchantConfig, rateLimitRemaining, withdrawMerchantWallet } from "./payluk-merchant";

function response(status: number, body: unknown, rateLimit = "limit=10, remaining=8, reset=40") {
  return { status, headers: { get: (h: string) => (h === "RateLimit" ? rateLimit : null) }, json: async () => body };
}

function deps(over: Partial<Parameters<typeof sweepPaylukCommission>[0]> = {}) {
  const rows: SweepRow[] = [];
  const fetchImpl = vi.fn(async () =>
    response(200, { status: 200, message: "ok", data: { id: "m", mainBalance: 1234.5, escrowBalance: "0", currency: "NGN" } }),
  );
  return {
    rows,
    fetchImpl,
    d: {
      env: { PAYLUK_TEST_SECRET_KEY: "sk_test_x" },
      fetchImpl,
      lastRunAt: async () => null,
      record: async (row: SweepRow) => (rows.push(row), true),
      now: () => new Date("2026-10-06T10:00:00Z"),
      ...over,
    },
  };
}

describe("payluk merchant helpers", () => {
  it("converts naira to kobo without floating point", () => {
    expect(nairaToKobo("150000")).toBe(15_000_000);
    expect(nairaToKobo("1234.5")).toBe(123_450);
    expect(nairaToKobo(0.1)).toBe(10);
    expect(nairaToKobo("-1")).toBeNull();
    expect(nairaToKobo("1.234")).toBeNull();
    expect(nairaToKobo(undefined)).toBeNull();
  });
  it("refuses a number with more than two decimals instead of rounding it", () => {
    expect(nairaToKobo(1.005)).toBeNull();
    expect(nairaToKobo(0.1 + 0.2)).toBeNull();
    expect(nairaToKobo(1234.56)).toBe(123_456);
    expect(nairaToKobo(1e21)).toBeNull();
  });
  it("picks the host from the key prefix, and nothing without a key", () => {
    expect(paylukMerchantConfig({})).toBeNull();
    expect(paylukMerchantConfig({ PAYLUK_SECRET_KEY: "sk_test_wrongslot" })).toBeNull();
    expect(paylukMerchantConfig({ PAYLUK_TEST_SECRET_KEY: "sk_test_a" })?.baseUrl).toBe("https://staging.api.payluk.ng");
    expect(paylukMerchantConfig({ PAYLUK_SECRET_KEY: "sk_live_a" })?.environment).toBe("production");
  });
  it("reads the RateLimit header", () => {
    expect(rateLimitRemaining("limit=10, remaining=3, reset=41")).toBe(3);
    expect(rateLimitRemaining(null)).toBeNull();
  });
  it("the merchant withdrawal is an unimplemented boundary, never a fake success", async () => {
    expect((await withdrawMerchantWallet()).kind).toBe("not_available");
  });
});

describe("sweepPaylukCommission", () => {
  it("no-ops cleanly with Payluk off: no request, no row", async () => {
    const { d, rows, fetchImpl } = deps({ env: {} });
    const v = await sweepPaylukCommission(d);
    expect(v.detail).toEqual({ skipped: "payluk_not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("is paced: no run within a minute of the last", async () => {
    const { d, fetchImpl } = deps({ lastRunAt: async () => new Date("2026-10-06T09:59:30Z") });
    expect((await sweepPaylukCommission(d)).detail).toEqual({ skipped: "paced" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the balance on the merchant route with no customer-id, and records the money waiting", async () => {
    const { d, rows, fetchImpl } = deps();
    const v = await sweepPaylukCommission(d);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe("https://staging.api.payluk.ng/v1/merchant/balance");
    expect(init.headers["customer-id"]).toBeUndefined();
    expect(rows[0]).toMatchObject({ outcome: "withdrawal_unavailable", main_balance_minor: 123_450, escrow_balance_minor: 0 });
    expect(v.alert?.kind).toBe("payluk.commission_waiting");
  });

  it("fails closed when the last run cannot be read: no request, no row", async () => {
    const { d, rows, fetchImpl } = deps({
      lastRunAt: async () => {
        throw new Error("read failed");
      },
    });
    const v = await sweepPaylukCommission(d);
    expect(v.detail).toMatchObject({ skipped: "paced", reason: "last_run_unreadable" });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("records started_at at the start and finished_at after it", async () => {
    const times = [new Date("2026-10-06T10:00:00Z"), new Date("2026-10-06T10:00:02Z")];
    let i = 0;
    const { d, rows } = deps({ now: () => times[Math.min(i++, times.length - 1)]! });
    await sweepPaylukCommission(d);
    expect(rows[0]?.started_at).toBe("2026-10-06T10:00:00.000Z");
    expect(rows[0]?.finished_at).toBe("2026-10-06T10:00:02.000Z");
    expect(Date.parse(rows[0]!.finished_at!)).toBeGreaterThanOrEqual(Date.parse(rows[0]!.started_at!));
  });

  it("a failed run carries started_at too", async () => {
    const { d, rows } = deps({ fetchImpl: async () => response(500, { message: "boom", data: {} }) });
    await sweepPaylukCommission(d);
    expect(rows[0]).toMatchObject({ outcome: "failed", started_at: "2026-10-06T10:00:00.000Z" });
  });

  it("records nothing_to_sweep on an empty wallet", async () => {
    const { d, rows } = deps({
      fetchImpl: async () => response(200, { data: { mainBalance: 0, escrowBalance: 0, currency: "NGN" } }),
    });
    await sweepPaylukCommission(d);
    expect(rows[0]?.outcome).toBe("nothing_to_sweep");
  });

  it("never spends the last request of the window on a withdrawal", async () => {
    const withdraw = vi.fn();
    const { d, rows } = deps({
      withdraw,
      fetchImpl: async () => response(200, { data: { mainBalance: 10, escrowBalance: 0 } }, "limit=10, remaining=1, reset=5"),
    });
    await sweepPaylukCommission(d);
    expect(withdraw).not.toHaveBeenCalled();
    expect(rows[0]?.outcome).toBe("paced");
  });

  it("records a failure with its code, and alerts", async () => {
    const { d, rows } = deps({ fetchImpl: async () => response(429, { status: 429, message: "Too many request", data: {} }) });
    const v = await sweepPaylukCommission(d);
    expect(rows[0]).toMatchObject({ outcome: "failed", error_code: "http_429" });
    expect(v.outcome).toBe("attention");
  });

  it("an unreadable balance is a failure, never a zero", async () => {
    const { d, rows } = deps({ fetchImpl: async () => response(200, { data: {} }) });
    await sweepPaylukCommission(d);
    expect(rows[0]).toMatchObject({ outcome: "failed", error_code: "unreadable" });
  });
});
