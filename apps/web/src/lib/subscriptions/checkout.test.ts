import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Opening a Vallo Pro / Vallo Business checkout, with the real Paystack client
 * (lib/payments/paystack.ts) over a mocked `fetch`: no network, no money. The
 * amount must be the plan row's, the Paystack plan must be made (once) at that
 * amount, the transaction must carry the plan code and card only, and nothing
 * may be granted here.
 */

const KEY = "sk_test_unit_checkout";
const saved: Record<string, string | undefined> = {};
const ENV = ["PAYSTACK_MODE", "PAYSTACK_SECRET_KEY", "PAYSTACK_TEST_SECRET_KEY", "VERCEL_ENV"] as const;

const providers = vi.hoisted(() => {
  class FiatProviderDisabled extends Error {}
  return { assertProviderEnabled: vi.fn(async () => {}), FiatProviderDisabled };
});
vi.mock("@/lib/payments/providers", () => providers);
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => {}) }));

const { openSubscriptionCheckout, confirmSubscriptionCharge, planOnSale } = await import("./checkout");
const { emailSha256 } = await import("./events");

const SUB_ID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const REF = `rm-sub-${SUB_ID}`;

const PRO_ROW = {
  plan_key: "pro",
  name: "Vallo Pro",
  is_default: false,
  price_minor: 950000,
  billing_interval: "month",
  effective_from: "2026-10-07T23:00:00Z",
  effective_to: null,
};

type Call = { url: string; method: string; body: Record<string, unknown> | null };

/** A stand-in for Paystack's API: answers per path and records every call. */
function paystackFetch(handlers: Record<string, (body: Record<string, unknown> | null) => { status?: number; json: unknown }>) {
  const calls: Call[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    calls.push({ url, method, body });
    const path = new URL(url).pathname;
    const key = `${method} ${path}`;
    const handler = handlers[key] ?? Object.entries(handlers).find(([k]) => key.startsWith(k.replace(/\*$/, "")) && k.endsWith("*"))?.[1];
    if (!handler) return new Response(JSON.stringify({ status: false, message: `unexpected ${key}` }), { status: 404 });
    const out = handler(body);
    return new Response(JSON.stringify(out.json), { status: out.status ?? 200 });
  });
  return { fn, calls };
}

/** A stand-in admin client: plan rows, recorded plan codes, and the RPCs. */
function fakeAdmin(opts: { recorded?: string | null; plans?: unknown[]; open?: unknown; subscriptionRow?: unknown } = {}) {
  const rpc = vi.fn(async (fn: string, args: Record<string, unknown>) => {
    if (fn === "subscription_provider_plan_record") return { data: args.p_plan_code, error: null };
    if (fn === "subscription_checkout_open")
      return { data: opts.open ?? { ok: true, subscription_id: SUB_ID, reference: REF, amount_minor: 950000, currency: "NGN", plan_key: "pro" }, error: null };
    if (fn === "subscription_apply_event") return { data: { outcome: "applied", status: "active", user_id: "u1" }, error: null };
    return { data: null, error: { message: `unexpected ${fn}` } };
  });
  let subscriptionReads = 0;
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const result = () => {
      if (table === "entitlement_plans") return { data: opts.plans ?? [PRO_ROW], error: null };
      if (table === "subscription_provider_plans") return { data: opts.recorded ? { provider_plan_code: opts.recorded } : null, error: null };
      if (table === "member_subscriptions") {
        subscriptionReads += 1;
        const rows = Array.isArray(opts.subscriptionRow) ? opts.subscriptionRow : [opts.subscriptionRow];
        return { data: rows[Math.min(subscriptionReads - 1, rows.length - 1)] ?? null, error: null };
      }
      return { data: null, error: null };
    };
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => result();
    chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve);
    return chain;
  });
  return { admin: { rpc, from } as never, rpc, from };
}

const INPUT = { memberId: "u1", email: "Ada@Example.com", planKey: "pro", callbackUrl: "https://vallospaces.com/pro/confirm" };

beforeAll(() => {
  for (const name of ENV) saved[name] = process.env[name];
  delete process.env.PAYSTACK_MODE;
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.VERCEL_ENV;
  process.env.PAYSTACK_TEST_SECRET_KEY = KEY;
});
afterAll(() => {
  for (const name of ENV) {
    if (saved[name] === undefined) delete process.env[name];
    else process.env[name] = saved[name];
  }
});
beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  providers.assertProviderEnabled.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const INIT_OK = () => ({ json: { status: true, data: { authorization_url: "https://checkout.paystack.com/abc", access_code: "abc", reference: REF } } });

describe("openSubscriptionCheckout", () => {
  it("opens at the plan row's price, under the recorded plan code, card only, and grants nothing", async () => {
    const paystack = paystackFetch({ "POST /transaction/initialize": INIT_OK });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin, rpc } = fakeAdmin({ recorded: "PLN_pro123" });

    const out = await openSubscriptionCheckout(admin, INPUT);

    expect(out).toEqual({
      ok: true,
      subscriptionId: SUB_ID,
      reference: REF,
      amountMinor: 950000,
      currency: "NGN",
      authorizationUrl: "https://checkout.paystack.com/abc",
      accessCode: "abc",
    });
    expect(rpc).toHaveBeenCalledWith("subscription_checkout_open", {
      p_user: "u1",
      p_plan_key: "pro",
      p_mode: "test",
      p_plan_code: "PLN_pro123",
      p_amount_minor: 950000,
      p_email_sha256: emailSha256("ada@example.com"),
    });
    expect(paystack.calls).toHaveLength(1);
    expect(paystack.calls[0]!.body).toMatchObject({
      email: "Ada@Example.com",
      amount: 950000,
      currency: "NGN",
      reference: REF,
      plan: "PLN_pro123",
      channels: ["card"],
      callback_url: "https://vallospaces.com/pro/confirm",
      metadata: { kind: "subscription", subscription_id: SUB_ID, plan_key: "pro" },
    });
    expect(rpc.mock.calls.some(([fn]) => fn === "subscription_apply_event")).toBe(false);
  });

  it("creates the Paystack plan at the row's amount the first time, and records it", async () => {
    const paystack = paystackFetch({
      "GET /plan": () => ({ json: { status: true, data: [] } }),
      "POST /plan": (body) => ({ json: { status: true, data: { plan_code: "PLN_new456", name: body?.name, amount: body?.amount, interval: "monthly", currency: "NGN" } } }),
      "POST /transaction/initialize": INIT_OK,
    });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin, rpc } = fakeAdmin({ recorded: null });

    const out = await openSubscriptionCheckout(admin, INPUT);

    expect(out.ok).toBe(true);
    const create = paystack.calls.find((c) => c.method === "POST" && c.url.endsWith("/plan"));
    expect(create?.body).toMatchObject({ amount: 950000, interval: "monthly", currency: "NGN" });
    expect(rpc).toHaveBeenCalledWith("subscription_provider_plan_record", { p_plan_key: "pro", p_mode: "test", p_plan_code: "PLN_new456", p_amount_minor: 950000 });
    expect(paystack.calls.find((c) => c.url.endsWith("/transaction/initialize"))?.body).toMatchObject({ plan: "PLN_new456" });
  });

  it("reuses a plan Paystack already has under Vallo's name instead of making a second", async () => {
    const paystack = paystackFetch({
      "GET /plan": () => ({
        json: { status: true, data: [{ plan_code: "PLN_old789", name: "Vallo Pro monthly (pro, 950000 kobo)", amount: 950000, interval: "monthly", currency: "NGN" }] },
      }),
      "POST /transaction/initialize": INIT_OK,
    });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin } = fakeAdmin({ recorded: null });
    await openSubscriptionCheckout(admin, INPUT);
    expect(paystack.calls.some((c) => c.method === "POST" && c.url.endsWith("/plan"))).toBe(false);
    expect(paystack.calls.find((c) => c.url.endsWith("/transaction/initialize"))?.body).toMatchObject({ plan: "PLN_old789" });
  });

  it("passes the database's refusals through, and opens nothing at Paystack", async () => {
    const paystack = paystackFetch({});
    vi.stubGlobal("fetch", paystack.fn);
    for (const reason of ["already_subscribed", "closed", "price_changed"] as const) {
      const { admin } = fakeAdmin({ recorded: "PLN_pro123", open: { ok: false, reason } });
      expect(await openSubscriptionCheckout(admin, INPUT)).toEqual({ ok: false, reason });
    }
    expect(paystack.calls).toHaveLength(0);
  });

  it("refuses a plan that is not on sale, without asking Paystack", async () => {
    const paystack = paystackFetch({});
    vi.stubGlobal("fetch", paystack.fn);
    const { admin } = fakeAdmin({ plans: [{ ...PRO_ROW, price_minor: null }] });
    expect(await openSubscriptionCheckout(admin, INPUT)).toEqual({ ok: false, reason: "unknown_plan" });
    expect(await openSubscriptionCheckout(admin, { ...INPUT, planKey: "Pro; drop" })).toEqual({ ok: false, reason: "unknown_plan" });
    expect(paystack.calls).toHaveLength(0);
  });

  it("is paused by the Paystack kill switch before anything is read or opened", async () => {
    providers.assertProviderEnabled.mockRejectedValue(new providers.FiatProviderDisabled("paystack"));
    const { admin, rpc } = fakeAdmin({ recorded: "PLN_pro123" });
    expect(await openSubscriptionCheckout(admin, INPUT)).toEqual({ ok: false, reason: "payments_paused" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says the outcome is unknown when Paystack does not answer, never that it failed", async () => {
    const paystack = paystackFetch({ "POST /transaction/initialize": () => ({ status: 502, json: {} }) });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin } = fakeAdmin({ recorded: "PLN_pro123" });
    expect(await openSubscriptionCheckout(admin, INPUT)).toEqual({ ok: false, reason: "outcome_unknown" });
  });

  it("is unavailable when Paystack refuses, with nothing to pay", async () => {
    const paystack = paystackFetch({ "POST /transaction/initialize": () => ({ status: 400, json: { status: false, message: "Invalid plan" } }) });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin } = fakeAdmin({ recorded: "PLN_pro123" });
    expect(await openSubscriptionCheckout(admin, INPUT)).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("confirmSubscriptionCharge (the return page and the in-page poll)", () => {
  it("answers paid from the database, without asking Paystack", async () => {
    const paystack = paystackFetch({});
    vi.stubGlobal("fetch", paystack.fn);
    const { admin, rpc } = fakeAdmin({ subscriptionRow: { status: "active", mode: "test" } });
    expect(await confirmSubscriptionCharge(admin, { memberId: "u1", reference: REF })).toBe("paid");
    expect(paystack.calls).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("verifies with Paystack itself and applies the charge under the webhook's own key", async () => {
    const paystack = paystackFetch({
      "GET /transaction/verify/*": () => ({
        json: {
          status: true,
          data: {
            status: "success",
            amount: 950000,
            currency: "NGN",
            reference: REF,
            paid_at: "2026-10-08T10:00:00.000Z",
            customer: { email: "ada@example.com", customer_code: "CUS_abc123" },
            plan: { plan_code: "PLN_pro123" },
            metadata: {},
          },
        },
      }),
    });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin, rpc } = fakeAdmin({ subscriptionRow: [{ status: "incomplete", mode: "test" }, { status: "active", mode: "test" }] });
    expect(await confirmSubscriptionCharge(admin, { memberId: "u1", reference: REF })).toBe("paid");
    expect(rpc).toHaveBeenCalledWith("subscription_apply_event", {
      p_mode: "test",
      p_event: "charge.success",
      p_event_key: `charge.success:${REF}`,
      p_data: { reference: REF, amount_minor: 950000, currency: "NGN", paid_at: "2026-10-08T10:00:00.000Z", customer_code: "CUS_abc123", plan_code: "PLN_pro123" },
    });
  });

  it("stays pending while Paystack has not taken the money, and never applies anything", async () => {
    const paystack = paystackFetch({ "GET /transaction/verify/*": () => ({ json: { status: true, data: { status: "abandoned", amount: 950000, currency: "NGN", reference: REF } } }) });
    vi.stubGlobal("fetch", paystack.fn);
    const { admin, rpc } = fakeAdmin({ subscriptionRow: { status: "incomplete", mode: "test" } });
    expect(await confirmSubscriptionCharge(admin, { memberId: "u1", reference: REF })).toBe("pending");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not find a reference that is not a subscription checkout, or not the member's", async () => {
    const { admin } = fakeAdmin({ subscriptionRow: null });
    expect(await confirmSubscriptionCharge(admin, { memberId: "u1", reference: "rm-book-x" })).toBe("not_found");
    expect(await confirmSubscriptionCharge(admin, { memberId: "u1", reference: REF })).toBe("not_found");
  });
});

describe("planOnSale", () => {
  it("is the latest priced monthly row in force, never the default plan", () => {
    const now = Date.parse("2026-10-09T00:00:00Z");
    expect(planOnSale([PRO_ROW], now)?.price_minor).toBe(950000);
    expect(planOnSale([{ ...PRO_ROW, is_default: true }], now)).toBeNull();
    expect(planOnSale([{ ...PRO_ROW, effective_from: "2027-01-01T00:00:00Z" }], now)).toBeNull();
    expect(planOnSale([PRO_ROW, { ...PRO_ROW, price_minor: 1200000, effective_from: "2026-10-08T23:00:00Z" }], now)?.price_minor).toBe(1200000);
  });
});
