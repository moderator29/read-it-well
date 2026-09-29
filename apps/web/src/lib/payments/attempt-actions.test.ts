import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * releaseCardAttempt: the payer closed the Paystack window. The browser's word
 * is never enough on its own. Paystack is asked (MOCKED here: `fetch` is
 * stubbed in every test, keys are placeholders) and only its answer closes
 * anything.
 */

const state = vi.hoisted(() => ({
  session: { state: "signed-in", user: { id: "guest-1" } } as Record<string, unknown>,
  owner: { bookingId: "bk-1", guestId: "guest-1" } as { bookingId: string; guestId: string } | null,
  row: { status: "PENDING", created_at: "", checkout_opened_at: null } as Record<string, unknown> | null,
  updates: [] as { values: Record<string, unknown>; filters: [string, unknown][] }[],
  limited: false,
}));

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: vi.fn(async () => state.session),
}));
vi.mock("../security/money-limits", () => ({
  guardMoney: vi.fn(async () => (state.limited ? { allowed: false, message: "slow down" } : { allowed: true })),
}));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => undefined) }));
vi.mock("./refund", () => ({ refundChargeToCard: vi.fn(async () => ({ ok: true, refundId: "r1" })) }));
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn(async () => undefined) }));
vi.mock("../bookings/settlement", () => ({
  bookingForReference: vi.fn(async () => state.owner),
  settleBookingCharge: vi.fn(),
}));
vi.mock("../bookings/checkout", () => ({
  settleCardPayment: vi.fn(async () => ({ ok: true, data: { bookingId: "bk-1", amountMinor: 200_000, confirmed: true } })),
}));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => {
    const chain = () => {
      const op = { values: {} as Record<string, unknown>, filters: [] as [string, unknown][], update: false };
      const c: Record<string, unknown> = {
        select: () => c,
        update: (values: Record<string, unknown>) => {
          op.update = true;
          op.values = values;
          state.updates.push(op);
          return c;
        },
        eq: (k: string, v: unknown) => {
          op.filters.push([k, v]);
          return c;
        },
        is: (k: string, v: unknown) => {
          op.filters.push([`${k}:is`, v]);
          return c;
        },
        maybeSingle: async () => ({ data: state.row, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ id: "tx-1" }], error: null }).then(resolve),
      };
      return c;
    };
    return { from: chain, rpc: vi.fn() };
  },
}));

import { releaseCardAttempt } from "./attempt-actions";
import { settleCardPayment } from "../bookings/checkout";

function paystackSays(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
const verified = (status: string) => ({
  status: true,
  message: "ok",
  data: { status, amount: 200_000, currency: "NGN", reference: "rm-book-x", paid_at: null, channel: "card", gateway_response: status, customer: null, metadata: {} },
});

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_live_placeholder");
  vi.stubEnv("PAYSTACK_TEST_SECRET_KEY", "");
  vi.stubEnv("PAYSTACK_MODE", "");
  vi.stubEnv("VERCEL_ENV", "production");
  state.session = { state: "signed-in", user: { id: "guest-1" } };
  state.owner = { bookingId: "bk-1", guestId: "guest-1" };
  state.row = { status: "PENDING", created_at: new Date().toISOString(), checkout_opened_at: new Date().toISOString() };
  state.updates = [];
  state.limited = false;
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const REF = "rm-book-00000000-0000-4000-8000-000000000000";

describe("releaseCardAttempt", () => {
  it("abandoned on Paystack: ABANDONED at once, only from PENDING", async () => {
    paystackSays(verified("abandoned"));
    const out = await releaseCardAttempt(REF);
    expect(out).toEqual({ ok: true, data: "abandoned" });
    expect(state.updates[0]?.values).toMatchObject({ status: "ABANDONED", closed_reason: "payer_closed" });
    expect(state.updates[0]?.filters).toContainEqual(["status", "PENDING"]);
  });

  it("closes only if the attempt was not reopened since it was read", async () => {
    paystackSays(verified("abandoned"));
    await releaseCardAttempt(REF);
    expect(state.updates[0]?.filters).toContainEqual(["checkout_opened_at", state.row?.checkout_opened_at]);
  });

  it("an attempt opened on the other Paystack mode stays PENDING and is never settled", async () => {
    state.row = { ...state.row, paystack_mode: "test" };
    const fetchSpy = paystackSays(verified("success"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "pending" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(settleCardPayment).not.toHaveBeenCalled();
    expect(state.updates).toEqual([]);
  });

  it("failed on Paystack: FAILED", async () => {
    paystackSays(verified("failed"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "failed" });
    expect(state.updates[0]?.values).toMatchObject({ status: "FAILED" });
  });

  it("not found on Paystack: ABANDONED", async () => {
    paystackSays({ status: false, message: "Transaction reference not found" }, 400);
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "abandoned" });
  });

  it("success on Paystack: settled through the normal return path, never marked abandoned", async () => {
    paystackSays(verified("success"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "paid" });
    expect(settleCardPayment).toHaveBeenCalledWith(REF);
    expect(state.updates.some((u) => u.values.status === "ABANDONED")).toBe(false);
  });

  it("network error: stays PENDING", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "pending" });
    for (const u of state.updates) expect(u.values.status).toBeUndefined();
  });

  it("still processing: stays PENDING", async () => {
    paystackSays(verified("ongoing"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "pending" });
    for (const u of state.updates) expect(u.values.status).toBeUndefined();
  });

  it("somebody else's attempt is ignored, and Paystack is not asked", async () => {
    state.owner = { bookingId: "bk-1", guestId: "someone-else" };
    const fetchSpy = paystackSays(verified("abandoned"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "ignored" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(state.updates).toEqual([]);
  });

  it("a reference that is not a booking charge is ignored", async () => {
    const fetchSpy = paystackSays(verified("abandoned"));
    expect(await releaseCardAttempt("rm-card-setup-1")).toEqual({ ok: true, data: "ignored" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("an attempt already settled is not touched", async () => {
    state.row = { status: "SUCCESSFUL", created_at: new Date().toISOString(), checkout_opened_at: null };
    const fetchSpy = paystackSays(verified("abandoned"));
    expect(await releaseCardAttempt(REF)).toEqual({ ok: true, data: "paid" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("signed out is refused", async () => {
    state.session = { state: "signed-out" };
    expect((await releaseCardAttempt(REF)).ok).toBe(false);
  });

  it("is rate limited like the status poll", async () => {
    state.limited = true;
    paystackSays(verified("abandoned"));
    expect(await releaseCardAttempt(REF)).toMatchObject({ ok: false });
  });
});
