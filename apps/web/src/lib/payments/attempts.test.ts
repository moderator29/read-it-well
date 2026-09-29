import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The attempt lifecycle against a MOCKED Paystack. No call here reaches
 * api.paystack.co: `fetch` is stubbed in every test, and the keys are
 * placeholders. The database is a recording fake, so each test can say
 * exactly which rows would have moved.
 */

vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => undefined) }));
vi.mock("./refund", () => ({ refundChargeToCard: vi.fn(async () => ({ ok: true, refundId: "r1" })) }));
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn(async () => undefined) }));

import { askPaystack, isReferenceNotFound, reuseLiveAttempt } from "./attempts";
import { sweepStaleAttempts, withAttemptSweep } from "./attempt-sweep";
import { PaystackError, PaystackUnknownOutcome } from "./paystack";
import { refundChargeToCard } from "./refund";
import type { AdminClient } from "@/lib/supabase/service";

/* ------------------------------------------------------------ fake Paystack */

function paystackSays(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function verified(status: string) {
  return {
    status: true,
    message: "Verification successful",
    data: {
      status,
      amount: 200_000,
      fees: 3_000,
      currency: "NGN",
      reference: "rm-book-x",
      paid_at: status === "success" ? "2026-09-29T11:00:00Z" : null,
      channel: "card",
      gateway_response: status,
      customer: { email: "payer@example.test" },
      metadata: {},
    },
  };
}

const NOT_FOUND = { status: false, message: "Transaction reference not found" };

/* ------------------------------------------------------------ fake database */

type Op = { table: string; kind: "select" | "update"; values?: Record<string, unknown>; filters: [string, unknown][] };

function fakeAdmin(opts: {
  due?: unknown[];
  reusable?: unknown[];
  settle?: unknown;
  updateMatches?: boolean;
}) {
  const ops: Op[] = [];
  const rpcs: { name: string; args: unknown }[] = [];

  function chain(table: string) {
    const op: Op = { table, kind: "select", filters: [] };
    const result = () => {
      if (op.kind === "update") {
        return { data: opts.updateMatches === false ? [] : [{ id: "tx-1" }], error: null };
      }
      return { data: opts.reusable ?? [], error: null };
    };
    const c: Record<string, unknown> = {
      select: () => c,
      update: (values: Record<string, unknown>) => {
        op.kind = "update";
        op.values = values;
        ops.push(op);
        return c;
      },
      eq: (k: string, v: unknown) => {
        op.filters.push([k, v]);
        return c;
      },
      not: () => c,
      is: (k: string, v: unknown) => {
        op.filters.push([k, v]);
        return c;
      },
      neq: () => c,
      order: () => c,
      limit: () => c,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve, reject),
    };
    return c;
  }

  const admin = {
    from: (table: string) => chain(table),
    rpc: async (name: string, args: unknown) => {
      rpcs.push({ name, args });
      if (name === "payment_attempts_due_for_check") return { data: opts.due ?? [], error: null };
      if (name === "settle_booking_charge") return { data: opts.settle ?? null, error: null };
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
  } as unknown as AdminClient;

  const updates = () => ops.filter((o) => o.kind === "update");
  return { admin, ops, rpcs, updates };
}

const NOW = Date.parse("2026-09-29T12:00:00Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function dueRow(over: Record<string, unknown> = {}) {
  return {
    id: "tx-1",
    provider_ref: "rm-book-x",
    booking_id: "bk-1",
    created_at: ago(60),
    checkout_opened_at: ago(60),
    processor_status: null,
    ...over,
  };
}

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_fake");
  vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", "");
  vi.stubEnv("PAYSTACK_MODE", "");
  vi.stubEnv("VERCEL_ENV", "production");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ tests */

describe("asking Paystack about a reference", () => {
  it("reads abandoned, failed and success as Paystack's own words", async () => {
    for (const status of ["abandoned", "failed", "success"]) {
      paystackSays(verified(status));
      const { answer } = await askPaystack("rm-book-x");
      expect(answer).toEqual({ kind: "status", status });
    }
  });

  it("reads 'reference not found' as not-found", async () => {
    paystackSays(NOT_FOUND, 400);
    expect((await askPaystack("rm-book-x")).answer).toEqual({ kind: "not-found" });
  });

  it("a network error, a 5xx or a refused key is unknown, never not-found", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    expect((await askPaystack("rm-book-x")).answer).toEqual({ kind: "unknown" });
    paystackSays({ status: false, message: "Transaction reference not found" }, 502);
    expect((await askPaystack("rm-book-x")).answer).toEqual({ kind: "unknown" });
    paystackSays({ status: false, message: "Invalid key" }, 401);
    expect((await askPaystack("rm-book-x")).answer).toEqual({ kind: "unknown" });
  });

  it("tells not-found apart from other refusals", () => {
    expect(isReferenceNotFound(new PaystackError("Transaction reference not found", 400))).toBe(true);
    expect(isReferenceNotFound(new PaystackError("Invalid key", 401))).toBe(false);
    expect(isReferenceNotFound(new PaystackUnknownOutcome("not found", 404))).toBe(false);
  });
});

describe("the stale attempt sweep (mocked Paystack)", () => {
  it("abandoned past the window: ABANDONED, only from PENDING", async () => {
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [dueRow()] });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary.counts).toMatchObject({ checked: 1, abandoned: 1, errors: 0 });
    const [u] = db.updates();
    expect(u?.values).toMatchObject({ status: "ABANDONED", closed_reason: "sweep_abandoned", processor_status: "abandoned" });
    expect(u?.filters).toContainEqual(["status", "PENDING"]);
    expect(db.rpcs[0]).toEqual({ name: "payment_attempts_due_for_check", args: { p_mode: "live", p_limit: 25 } });
  });

  it("failed: FAILED", async () => {
    paystackSays(verified("failed"));
    const db = fakeAdmin({ due: [dueRow()] });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary.counts.failed).toBe(1);
    expect(db.updates()[0]?.values).toMatchObject({ status: "FAILED", closed_reason: "processor_failed" });
  });

  it("not found past the window: ABANDONED", async () => {
    paystackSays(NOT_FOUND, 400);
    const db = fakeAdmin({ due: [dueRow()] });
    await sweepStaleAttempts(db.admin, () => NOW);
    expect(db.updates()[0]?.values).toMatchObject({ status: "ABANDONED", closed_reason: "sweep_not_found" });
  });

  it("success: settled through settle_booking_charge, never marked by hand", async () => {
    paystackSays(verified("success"));
    const db = fakeAdmin({
      due: [dueRow()],
      settle: { outcome: "settled", booking_id: "bk-1", confirmed: true, amount_minor: 200_000, ledger: { grossMinor: 200_000 } },
    });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary.counts.settled).toBe(1);
    const settle = db.rpcs.find((r) => r.name === "settle_booking_charge");
    expect(settle?.args).toMatchObject({ p_reference: "rm-book-x", p_amount_minor: 200_000, p_processor_fee_minor: 3_000 });
    expect(db.updates().some((u) => u.values?.status === "ABANDONED" || u.values?.status === "SUCCESSFUL")).toBe(false);
  });

  it("success that cannot be applied goes back to the card", async () => {
    paystackSays(verified("success"));
    const db = fakeAdmin({
      due: [dueRow()],
      settle: { outcome: "refund-due", booking_id: "bk-1", reason: "agreement_cancelled", amount_minor: 200_000, reference: "rm-book-x" },
    });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary.counts.refunded).toBe(1);
    expect(refundChargeToCard).toHaveBeenCalledTimes(1);
  });

  it("network error: stays PENDING (only the check time is recorded), and is not an error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    const db = fakeAdmin({ due: [dueRow()] });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary.counts).toMatchObject({ unknown: 1, kept: 1, errors: 0 });
    for (const u of db.updates()) expect(u.values?.status).toBeUndefined();
  });

  it("a charge still moving stays PENDING with Paystack's word recorded", async () => {
    paystackSays(verified("ongoing"));
    const db = fakeAdmin({ due: [dueRow()] });
    await sweepStaleAttempts(db.admin, () => NOW);
    const [u] = db.updates();
    expect(u?.values).toMatchObject({ processor_status: "ongoing" });
    expect(u?.values?.status).toBeUndefined();
  });

  it("asks only for attempts on its own mode", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", "sk_test_fake");
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [] });
    await sweepStaleAttempts(db.admin, () => NOW);
    expect(db.rpcs[0]?.args).toEqual({ p_mode: "test", p_limit: 25 });
  });

  it("does nothing and throws nothing without a key", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    const fetchSpy = paystackSays(verified("abandoned"));
    const db = fakeAdmin({ due: [dueRow()] });
    const summary = await sweepStaleAttempts(db.admin, () => NOW);
    expect(summary).toMatchObject({ ran: false, reason: "paystack_not_configured" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("folds into the hold sweep's verdict without hiding the hold sweep's own alert", () => {
    const hold = { outcome: "ok" as const, counts: { released: 2 }, detail: {}, alert: null };
    const clean = withAttemptSweep(hold, {
      ran: true,
      mode: "live",
      reason: null,
      counts: { checked: 1, deferred: 0, not_ngn: 0, settled: 0, refunded: 0, failed: 0, abandoned: 1, kept: 0, unknown: 0, errors: 0 },
    });
    expect(clean.outcome).toBe("ok");
    expect(clean.counts).toMatchObject({ released: 2, attempts_abandoned: 1 });
    const erred = withAttemptSweep(hold, {
      ran: false,
      mode: "live",
      reason: "due_list_unreadable",
      counts: { checked: 0, deferred: 0, not_ngn: 0, settled: 0, refunded: 0, failed: 0, abandoned: 0, kept: 0, unknown: 0, errors: 1 },
    });
    expect(erred.outcome).toBe("attention");
    expect(erred.alert?.kind).toBe("cron.attempt_sweep.errors");
  });
});

describe("a retry reuses the live attempt (mocked Paystack)", () => {
  const quote = {
    amountMinor: 200_000,
    agreementId: "ag-1",
    commissionMinor: 0,
    mode: "live" as const,
    split: { listerSubaccount: "ACCT_lister", listerShareMinor: 197_000, reserveSubaccount: "ACCT_reserve", guaranteeMinor: 3_000 },
  };
  const live = {
    id: "tx-1",
    provider_ref: "rm-book-x",
    status: "PENDING",
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    checkout_opened_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    processor_status: null,
    processor_checked_at: null,
    access_code: "acc_live",
    authorization_url: "https://checkout.paystack.com/acc_live",
    amount_minor: 200_000,
    agreement_id: "ag-1",
    payee_subaccount_code: "ACCT_lister",
    reserve_subaccount_code: "ACCT_reserve",
    lister_share_minor: 197_000,
    guarantee_minor: 3_000,
    commission_minor: 0,
    paystack_mode: "live",
  };

  it("hands back the same access code while Paystack says it is open, and opens nothing", async () => {
    const fetchSpy = paystackSays(verified("abandoned"));
    const db = fakeAdmin({ reusable: [live] });
    const out = await reuseLiveAttempt(db.admin, "bk-1", quote);
    expect(out).toEqual({
      kind: "checkout",
      checkout: {
        accessCode: "acc_live",
        authorizationUrl: "https://checkout.paystack.com/acc_live",
        reference: "rm-book-x",
        amountMinor: 200_000,
      },
    });
    /* One verify, never an initialize. */
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(String((fetchSpy.mock.calls[0] as unknown[])[0])).toContain("/transaction/verify/rm-book-x");
    expect(db.updates()[0]?.values).toHaveProperty("checkout_opened_at");
  });

  it("reuses on a network error rather than opening a second checkout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    const db = fakeAdmin({ reusable: [live] });
    expect((await reuseLiveAttempt(db.admin, "bk-1", quote)).kind).toBe("checkout");
  });

  it("a live attempt that was in fact paid is settled and nothing new opens", async () => {
    paystackSays(verified("success"));
    const db = fakeAdmin({
      reusable: [live],
      settle: { outcome: "settled", booking_id: "bk-1", confirmed: true, amount_minor: 200_000, ledger: { grossMinor: 200_000 } },
    });
    const out = await reuseLiveAttempt(db.admin, "bk-1", quote);
    expect(out.kind).toBe("paid");
    expect(db.rpcs.some((r) => r.name === "settle_booking_charge")).toBe(true);
  });

  it("a failed live attempt is closed and a new one may open", async () => {
    paystackSays(verified("failed"));
    const db = fakeAdmin({ reusable: [live] });
    expect((await reuseLiveAttempt(db.admin, "bk-1", quote)).kind).toBe("none");
    expect(db.updates()[0]?.values).toMatchObject({ status: "FAILED" });
  });

  it("nothing to reuse for a different charge", async () => {
    const fetchSpy = paystackSays(verified("abandoned"));
    const db = fakeAdmin({ reusable: [{ ...live, amount_minor: 150_000 }] });
    expect((await reuseLiveAttempt(db.admin, "bk-1", quote)).kind).toBe("none");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("if the attempt closed between the read and the claim, a new one opens", async () => {
    paystackSays(verified("abandoned"));
    const db = fakeAdmin({ reusable: [live], updateMatches: false });
    expect((await reuseLiveAttempt(db.admin, "bk-1", quote)).kind).toBe("none");
  });
});
