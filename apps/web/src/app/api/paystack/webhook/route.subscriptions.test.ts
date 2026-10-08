import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * VALLO PRO AND VALLO BUSINESS THROUGH THE PAYSTACK WEBHOOK.
 *
 * The signature is checked for real here (HMAC SHA-512 of the raw body with
 * the test-mode secret key, through paystack-mode and the provider seam), so
 * a body signed with another key, or changed after signing, never reaches the
 * database. Past the signature, every subscription event goes to ONE database
 * call, `subscription_apply_event`, which owns the state machine (trialing,
 * active, past_due, non_renewing, cancelled, expired: proven by the probe
 * subscriptions-checkout.sql); these tests hold what the route sends it and
 * how each of its answers is acknowledged.
 */

const KEY = "sk_test_unit_subscriptions";
const saved: Record<string, string | undefined> = {};
const ENV = ["PAYSTACK_MODE", "PAYSTACK_SECRET_KEY", "PAYSTACK_TEST_SECRET_KEY", "VERCEL_ENV"] as const;

const rpc = vi.hoisted(() => vi.fn());
const service = vi.hoisted(() => ({ getAdminClient: vi.fn() }));
const audit = vi.hoisted(() => ({ recordMoneyAudit: vi.fn(async () => {}), recordWebhookDelivery: vi.fn(async () => {}) }));
const alerts = vi.hoisted(() => ({ recordAlert: vi.fn(async () => {}) }));

vi.mock("@/lib/supabase/service", () => service);
vi.mock("@/lib/money/audit", () => audit);
vi.mock("@/lib/alerts", () => alerts);
vi.mock("@/lib/security/money-limits", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security/money-limits")>();
  return { ...actual, countRouteFailure: vi.fn(async () => ({ allowed: true })) };
});

const { POST } = await import("./route");

const REF = "rm-sub-3f2504e0-4f89-11d3-9a0c-0305e82c3301";

function sign(body: string, key = KEY): string {
  return createHmac("sha512", key).update(body, "utf8").digest("hex");
}

function delivery(payload: unknown, opts: { key?: string; tamper?: boolean } = {}): Request {
  const body = JSON.stringify(payload);
  const signature = sign(body, opts.key ?? KEY);
  return new Request("https://vallospaces.com/api/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature, "content-type": "application/json" },
    body: opts.tamper ? body.replace("950000", "1") : body,
  });
}

const firstCharge = {
  event: "charge.success",
  data: {
    reference: REF,
    amount: 950000,
    currency: "NGN",
    status: "success",
    paid_at: "2026-10-08T10:00:00.000Z",
    customer: { customer_code: "CUS_abc123", email: "ada@example.com" },
    plan: { plan_code: "PLN_pro123" },
    authorization: { authorization_code: "AUTH_secret", last4: "4081", signature: "SIG_x" },
  },
};

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
  service.getAdminClient.mockReturnValue({ rpc, from: () => ({}) });
  rpc.mockResolvedValue({ data: { outcome: "applied", status: "active", user_id: "u1", subscription_id: "s1" }, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the signature", () => {
  it("applies a charge signed with this mode's key", async () => {
    const response = await POST(delivery(firstCharge));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true, reason: "subscription_charge.success_applied" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("refuses a body signed with another key, and writes nothing", async () => {
    const response = await POST(delivery(firstCharge, { key: "sk_test_somebody_else" }));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    expect(audit.recordWebhookDelivery).not.toHaveBeenCalled();
  });

  it("refuses a body changed after it was signed", async () => {
    const response = await POST(delivery(firstCharge, { tamper: true }));
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("what reaches the database", () => {
  it("one call, in this mode, keyed by the reference, with codes and kobo and never the card or the address", async () => {
    await POST(delivery(firstCharge));
    expect(rpc).toHaveBeenCalledWith("subscription_apply_event", {
      p_mode: "test",
      p_event: "charge.success",
      p_event_key: `charge.success:${REF}`,
      p_data: expect.objectContaining({ reference: REF, amount_minor: 950000, currency: "NGN", customer_code: "CUS_abc123", plan_code: "PLN_pro123" }),
    });
    const sent = JSON.stringify(rpc.mock.calls[0]);
    expect(sent).not.toMatch(/AUTH_secret|4081|SIG_x|ada@example\.com/);
  });

  it("routes a renewal Paystack charged under a plan to subscriptions, not to the unknown-reference alert", async () => {
    const response = await POST(
      delivery({ event: "charge.success", data: { reference: "T7xkq2r", amount: 950000, currency: "NGN", plan: { plan_code: "PLN_pro123" }, customer: { customer_code: "CUS_abc123" } } }),
    );
    expect(response.status).toBe(200);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({ p_event: "charge.success", p_event_key: "charge.success:T7xkq2r" });
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("sends each lifecycle event the database moves the plan on", async () => {
    const lifecycle = [
      { event: "subscription.create", data: { subscription_code: "SUB_vbdx", email_token: "tok_1", plan: { plan_code: "PLN_pro123" }, customer: { email: "ada@example.com" } } },
      { event: "invoice.create", data: { invoice_code: "INV_1", status: "pending", subscription: { subscription_code: "SUB_vbdx" } } },
      { event: "invoice.payment_failed", data: { invoice_code: "INV_1", status: "failed", subscription: { subscription_code: "SUB_vbdx" } } },
      { event: "invoice.update", data: { invoice_code: "INV_1", status: "success", paid: true, subscription: { subscription_code: "SUB_vbdx" } } },
      { event: "subscription.not_renew", data: { subscription_code: "SUB_vbdx", status: "non-renewing" } },
      { event: "subscription.disable", data: { subscription_code: "SUB_vbdx", status: "complete" } },
    ];
    for (const payload of lifecycle) {
      const response = await POST(delivery(payload));
      expect(response.status, payload.event).toBe(200);
    }
    expect(rpc.mock.calls.map((c) => [c[1].p_event, c[1].p_event_key])).toEqual([
      ["subscription.create", "subscription.create:SUB_vbdx"],
      ["invoice.create", "invoice.create:INV_1"],
      ["invoice.payment_failed", "invoice.payment_failed:INV_1"],
      ["invoice.update", "invoice.update:INV_1:success"],
      ["subscription.not_renew", "subscription.not_renew:SUB_vbdx"],
      ["subscription.disable", "subscription.disable:SUB_vbdx"],
    ]);
    // The checkout is found by the hash of the address, never the address.
    expect(rpc.mock.calls[0]?.[1].p_data.email_sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("acknowledges an event it does not act on without calling the database", async () => {
    const response = await POST(delivery({ event: "subscription.expiring_cards", data: [] }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reason: "event_unhandled:subscription.expiring_cards" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a declined first charge leaves the checkout unpaid, with no alert", async () => {
    const response = await POST(delivery({ event: "charge.failed", data: { reference: REF, amount: 950000 } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reason: "subscription_charge_failed" });
    expect(rpc).not.toHaveBeenCalled();
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });
});

describe("how each answer is acknowledged", () => {
  it("a replay is a duplicate: 200, nothing moves twice", async () => {
    rpc.mockResolvedValue({ data: { outcome: "duplicate" }, error: null });
    const response = await POST(delivery(firstCharge));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reason: "subscription_charge.success_duplicate" });
  });

  it("a write that errored is 500, so Paystack retries (the apply is idempotent)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "deadlock detected" } });
    const response = await POST(delivery(firstCharge));
    expect(response.status).toBe(500);
    expect(alerts.recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.paystack.settlement_failed", severity: "critical" }));
  });

  it("money that does not match the plan is never granted, and the desk is told", async () => {
    rpc.mockResolvedValue({ data: { outcome: "mismatch", status: "mismatch", user_id: "u1" }, error: null });
    const response = await POST(delivery(firstCharge));
    expect(response.status).toBe(200);
    expect(alerts.recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.paystack.settlement_failed", severity: "critical" }));
  });

  it("an event about nothing of ours is recorded, acknowledged and raised as an unknown reference", async () => {
    rpc.mockResolvedValue({ data: { outcome: "unmatched" }, error: null });
    const response = await POST(delivery({ event: "subscription.disable", data: { subscription_code: "SUB_other" } }));
    expect(response.status).toBe(200);
    expect(alerts.recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.paystack.unknown_reference" }));
  });
});
