import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The attempt sweep's own guarantees, against a MOCKED Paystack (fetch is
 * stubbed in every test; keys are placeholders) and a recording fake database:
 * its time budget, the reopen race, the mode fence, the not-in-naira stop, and
 * its place after the hold release in the hourly job.
 */

vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => undefined) }));
vi.mock("./refund", () => ({ refundChargeToCard: vi.fn(async () => ({ ok: true, refundId: "r1" })) }));
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn(async () => undefined) }));

const order = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock("../cron/rpc", () => ({
  callServiceFunction: vi.fn(async (_admin: unknown, name: string) => {
    order.calls.push(name);
    return { released: [], paid_pending: [], payment_in_flight: [], accepted_unpaid: [], agreement_pending: [], ttl_hours: 48 };
  }),
}));

import { SWEEP_BUDGET_MS, sweepStaleAttempts } from "./attempt-sweep";
import { holdSweep } from "../cron/jobs/hold-sweep";
import { recordAlert } from "@/lib/alerts";
import type { AdminClient } from "@/lib/supabase/service";

type Op = { kind: "select" | "update"; values?: Record<string, unknown>; filters: [string, unknown][] };

function fakeAdmin(opts: { due?: unknown[]; row?: Record<string, unknown> | null; settle?: unknown }) {
  const ops: Op[] = [];
  const rpcs: string[] = [];
  const chain = () => {
    const op: Op = { kind: "select", filters: [] };
    const c: Record<string, unknown> = {
      select: () => c,
      update: (values: Record<string, unknown>) => {
        op.kind = "update";
        op.values = values;
        ops.push(op);
        return c;
      },
      eq: (k: string, v: unknown) => (op.filters.push([k, v]), c),
      is: (k: string, v: unknown) => (op.filters.push([`${k}:is`, v]), c),
      neq: () => c,
      not: () => c,
      order: () => c,
      limit: () => c,
      maybeSingle: async () => ({ data: opts.row ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: "tx" }], error: null }).then(resolve),
    };
    return c;
  };
  const admin = {
    from: chain,
    rpc: async (name: string) => {
      rpcs.push(name);
      order.calls.push(name);
      if (name === "payment_attempts_due_for_check") return { data: opts.due ?? [], error: null };
      if (name === "settle_booking_charge") return { data: opts.settle ?? null, error: null };
      return { data: null, error: { message: "unexpected" } };
    },
  } as unknown as AdminClient;
  return { admin, ops, rpcs, updates: () => ops.filter((o) => o.kind === "update") };
}

const NOW = Date.parse("2026-09-29T12:00:00Z");
const ago = (m: number) => new Date(NOW - m * 60_000).toISOString();
const due = (i: number, over: Record<string, unknown> = {}) => ({
  id: `tx-${i}`,
  provider_ref: `rm-book-${i}`,
  booking_id: "bk-1",
  created_at: ago(60),
  checkout_opened_at: ago(60),
  processor_status: null,
  paystack_mode: "live",
  ...over,
});
const verified = (status: string, currency = "NGN") => ({
  status: true,
  message: "ok",
  data: { status, amount: 200_000, fees: 3_000, currency, reference: "r", paid_at: null, channel: "card", gateway_response: status, customer: null, metadata: {} },
});
const paystackSays = (body: unknown, status = 200) => {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
};

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_placeholder");
  vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", "");
  vi.stubEnv("PAYSTACK_MODE", "");
  vi.stubEnv("VERCEL_ENV", "production");
  order.calls = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("the attempt sweep", () => {
  it("stops starting checks when its time budget is spent and defers the rest", async () => {
    const fetchSpy = paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [due(1), due(2), due(3)] });
    let t = NOW;
    /* Each check "takes" 25 s of the clock. */
    const clock = () => {
      const v = t;
      t += 12_500;
      return v;
    };
    const s = await sweepStaleAttempts(db.admin, clock, SWEEP_BUDGET_MS);
    expect(s.counts.checked).toBeLessThan(3);
    expect(s.counts.deferred).toBe(3 - s.counts.checked);
    expect(fetchSpy).toHaveBeenCalledTimes(s.counts.checked);
  });

  it("closes only if the attempt was not reopened since it was read (checkout_opened_at snapshot)", async () => {
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [due(1)] });
    await sweepStaleAttempts(db.admin, () => NOW);
    const [u] = db.updates();
    expect(u?.values).toMatchObject({ status: "ABANDONED" });
    expect(u?.filters).toContainEqual(["checkout_opened_at", ago(60)]);
    expect(u?.filters).toContainEqual(["status", "PENDING"]);
  });

  it("matches a never-opened attempt with IS NULL rather than equality", async () => {
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [due(1, { checkout_opened_at: null })] });
    await sweepStaleAttempts(db.admin, () => NOW);
    expect(db.updates()[0]?.filters).toContainEqual(["checkout_opened_at:is", null]);
  });

  it("never settles an attempt made on the other mode", async () => {
    paystackSays(verified("success"));
    const db = fakeAdmin({ due: [due(1)], row: { paystack_mode: "test", processor_status: null } });
    const s = await sweepStaleAttempts(db.admin, () => NOW);
    expect(db.rpcs).not.toContain("settle_booking_charge");
    expect(s.counts.settled).toBe(0);
  });

  it("skips a listed row of the other mode without asking Paystack", async () => {
    const fetchSpy = paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [due(1, { paystack_mode: "test" })] });
    const s = await sweepStaleAttempts(db.admin, () => NOW);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(s.counts.checked).toBe(0);
  });

  it("a success not in naira is flagged not_ngn with one alert and never settled", async () => {
    paystackSays(verified("success", "USD"));
    const db = fakeAdmin({ due: [due(1)], row: { paystack_mode: "live", processor_status: null } });
    const s = await sweepStaleAttempts(db.admin, () => NOW);
    expect(s.counts.not_ngn).toBe(1);
    expect(db.rpcs).not.toContain("settle_booking_charge");
    expect(db.updates()[0]?.values).toMatchObject({ processor_status: "not_ngn" });
    expect(recordAlert).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordAlert).mock.calls[0]?.[0]).toMatchObject({ kind: "payment.attempt.not_ngn" });
  });

  it("an attempt already flagged not_ngn raises no second alert", async () => {
    paystackSays(verified("success", "USD"));
    const db = fakeAdmin({ due: [due(1)], row: { paystack_mode: "live", processor_status: "not_ngn" } });
    await sweepStaleAttempts(db.admin, () => NOW);
    expect(recordAlert).not.toHaveBeenCalled();
  });

  it("runs after the hold release in the hourly job, so Paystack can never delay it", async () => {
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [due(1)] });
    const verdict = await holdSweep(db.admin);
    expect(order.calls.indexOf("expire_booking_holds")).toBeLessThan(order.calls.indexOf("payment_attempts_due_for_check"));
    expect(verdict.counts).toHaveProperty("attempts_checked", 1);
  });
});
