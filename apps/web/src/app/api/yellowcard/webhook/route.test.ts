/**
 * The Yellow Card webhook. The signature check is the REAL one (HMAC-SHA256,
 * base64, keyed by YELLOWCARD_WEBHOOK_SECRET) and so is the body parser; only
 * the apply door, the audit writers, the alert writer and the failure counter
 * are stand-ins. Idempotency and ordering are the database's
 * (`crypto_payment_apply`, proven by supabase/tests/probes/crypto-pay.sql);
 * here the route must pass every signed report there and answer correctly.
 *
 * No wallet, no custody: the provider has already settled naira straight to
 * the split legs before it tells us anything.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Applied = { ok: boolean; outcome: string; state: string | null; chargeOutcome: string | null };
const applyEvent = vi.fn(async (..._args: unknown[]): Promise<Applied> => ({ ok: true, outcome: "applied", state: "settled", chargeOutcome: "settled" }));
let admin: object | null = {};
const recordAlert = vi.fn(async (_input: unknown) => ({ ok: true, id: "a", deduplicated: false }));

vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => admin }));
vi.mock("@/lib/crypto/service", () => ({ applyEvent: (...args: unknown[]) => applyEvent(...args) }));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: async () => {}, recordWebhookDelivery: async () => {} }));
vi.mock("@/lib/alerts", () => ({ recordAlert: (i: unknown) => recordAlert(i) }));
vi.mock("@/lib/security/money-limits", () => ({
  ROUTE_FAILURE_LIMITS: { webhookBadSignature: {} },
  countRouteFailure: async () => ({ allowed: true }),
}));
vi.mock("@/lib/payments/observability", () => ({ logMoney: () => {}, failureReason: () => "x" }));

const { POST } = await import("./route");

const SECRET = "yc_webhook_secret";
const REFERENCE = "rm-yc-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";

function delivery(body: object | string, signWith: string | null = SECRET) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signWith !== null) headers["x-yc-signature"] = createHmac("sha256", signWith).update(raw, "utf8").digest("base64");
  return new Request("https://www.vallospaces.com/api/yellowcard/webhook", { method: "POST", body: raw, headers });
}

const SETTLED = {
  eventId: "evt_settled_1",
  data: { id: "yc_pay_1", sequenceId: REFERENCE, status: "COMPLETED", asset: "USDT", network: "TRON", amountReceived: "103.014695", settledAmount: "170000.00", txHash: "abcdef0123456789" },
};

beforeEach(() => {
  vi.stubEnv("YELLOWCARD_API_KEY", "yc_key");
  vi.stubEnv("YELLOWCARD_API_SECRET", "yc_api_secret");
  vi.stubEnv("YELLOWCARD_API_BASE", "https://api.yellowcard.example");
  vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", SECRET);
  admin = {};
  applyEvent.mockClear();
  applyEvent.mockImplementation(async () => ({ ok: true, outcome: "applied", state: "settled", chargeOutcome: "settled" }));
  recordAlert.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/yellowcard/webhook", () => {
  it("passes a signed settlement to the apply door, in naira kobo, and answers 200", async () => {
    const res = await POST(delivery(SETTLED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: true, outcome: "applied" });
    expect(applyEvent).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ id: "yellowcard" }),
      expect.objectContaining({ eventId: "evt_settled_1", reference: REFERENCE, state: "settled", facts: expect.objectContaining({ settledMinor: 17_000_000 }) }),
      "webhook",
    );
  });

  it("carries a settled report with no settledAmount through WITHOUT an amount, for the database to refuse", async () => {
    applyEvent.mockImplementation(async () => ({ ok: false, outcome: "amount-mismatch", state: "converting", chargeOutcome: null }));
    const { settledAmount: _dropped, ...rest } = SETTLED.data;
    void _dropped;
    const res = await POST(delivery({ eventId: "evt_no_amount", data: { ...rest, localAmount: "170000.00" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ acted: false, outcome: "amount-mismatch" });
    const facts = (applyEvent.mock.calls[0]![2] as { facts: Record<string, unknown> }).facts;
    expect(facts.settledMinor).toBeUndefined();
  });

  it("answers a duplicate delivery 200 without acting again", async () => {
    applyEvent.mockImplementation(async () => ({ ok: true, outcome: "duplicate", state: "settled", chargeOutcome: null }));
    const first = await POST(delivery(SETTLED));
    const again = await POST(delivery(SETTLED));
    expect(first.status).toBe(200);
    expect(await again.json()).toEqual({ received: true, acted: false, outcome: "duplicate" });
    // Both deliveries carried the same event id to the database, which is what makes the second a no-op.
    expect(applyEvent.mock.calls.map((c) => (c[2] as { eventId: string }).eventId)).toEqual(["evt_settled_1", "evt_settled_1"]);
  });

  it("answers an out-of-order report 200 and does not act", async () => {
    applyEvent.mockImplementation(async () => ({ ok: true, outcome: "refused", state: "converting", chargeOutcome: null }));
    const res = await POST(delivery({ ...SETTLED, data: { ...SETTLED.data, status: "CONFIRMING" } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ acted: false, outcome: "refused" });
  });

  it("carries progress reports (confirmations) through as updates", async () => {
    applyEvent.mockImplementation(async () => ({ ok: true, outcome: "updated", state: "confirming", chargeOutcome: null }));
    const res = await POST(delivery({ sequenceId: REFERENCE, status: "CONFIRMING", confirmations: 5, txHash: "abcdef0123456789" }));
    expect(await res.json()).toMatchObject({ acted: true, outcome: "updated" });
    expect(applyEvent.mock.calls[0]![2]).toMatchObject({ state: "confirming", facts: { confirmations: 5 } });
  });

  it("refuses a forged body with 401 and applies nothing", async () => {
    const res = await POST(delivery(SETTLED, "attacker_secret"));
    expect(res.status).toBe(401);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("refuses a body signed with the API secret rather than the webhook secret", async () => {
    const res = await POST(delivery(SETTLED, "yc_api_secret"));
    expect(res.status).toBe(401);
  });

  it("refuses an unsigned body with 401", async () => {
    const res = await POST(delivery(SETTLED, null));
    expect(res.status).toBe(401);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("answers 400 to a signed body that is not JSON", async () => {
    const res = await POST(delivery("not json"));
    expect(res.status).toBe(400);
  });

  it("answers 500 (stay in the retry queue), not 200, while the webhook secret is unset", async () => {
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "");
    const res = await POST(delivery(SETTLED, ""));
    expect(res.status).toBe(500);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("answers 500 and raises a critical alert when the service role key is missing", async () => {
    admin = null;
    const res = await POST(delivery(SETTLED));
    expect(res.status).toBe(500);
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.yellowcard.unconfigured", severity: "critical" }));
  });

  it("answers 500 when the database cannot record it, so the delivery is retried", async () => {
    applyEvent.mockImplementation(async () => {
      throw new Error("db down");
    });
    const res = await POST(delivery(SETTLED));
    expect(res.status).toBe(500);
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.yellowcard.settlement_failed" }));
  });

  it("does not act on a reference this platform did not mint", async () => {
    const res = await POST(delivery({ ...SETTLED, data: { ...SETTLED.data, sequenceId: "rm-book-something-else" } }));
    expect(res.status).toBe(200);
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("acknowledges a status it cannot read without acting", async () => {
    const res = await POST(delivery({ sequenceId: REFERENCE, status: "SOMETHING_NEW" }));
    expect(res.status).toBe(200);
    expect(applyEvent).not.toHaveBeenCalled();
  });
});
