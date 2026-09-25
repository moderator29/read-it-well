/**
 * The Yellow Card webhook. The signature check here is the REAL one
 * (HMAC-SHA256, base64, keyed by YELLOWCARD_API_SECRET); only the settlement,
 * the audit writers, the alert writer and the failure counter are stand-ins.
 *
 * Track A: there is no wallet. A completed collection settles one booking
 * charge, in naira, and a collection that cannot be applied raises a critical
 * alert so a person returns it through Yellow Card.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Settlement =
  | { outcome: "settled"; bookingId: string }
  | { outcome: "refund-due"; bookingId: string; reason: string; amountMinor: number; reference: string }
  | { outcome: "already-settled"; bookingId: string | null }
  | { outcome: "unknown-reference" };

const settleBookingCharge = vi.fn(async (_admin: unknown, _input: unknown): Promise<Settlement> => ({
  outcome: "settled",
  bookingId: "booking-1",
}));
let admin: object | null = {};
const recordAlert = vi.fn(async (_input: unknown) => ({ ok: true, id: "a", deduplicated: false }));

vi.mock("@/lib/supabase/service", () => ({ getAdminClient: () => admin }));
vi.mock("@/lib/bookings/settlement", () => ({
  settleBookingCharge: (a: unknown, i: unknown) => settleBookingCharge(a, i),
}));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: async () => {}, recordWebhookDelivery: async () => {} }));
vi.mock("@/lib/alerts", () => ({ recordAlert: (i: unknown) => recordAlert(i) }));
vi.mock("@/lib/security/money-limits", () => ({
  ROUTE_FAILURE_LIMITS: { webhookBadSignature: {} },
  countRouteFailure: async () => ({ allowed: true }),
}));
vi.mock("@/lib/payments/observability", () => ({ logMoney: () => {}, failureReason: () => "x" }));

const { POST } = await import("./route");

const SECRET = "yc_test_secret";
const REFERENCE = "rm-yc-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";

function delivery(body: object, signWith: string | null = SECRET) {
  const raw = JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signWith !== null) headers["x-yc-signature"] = createHmac("sha256", signWith).update(raw, "utf8").digest("base64");
  return new Request("https://www.vallospaces.com/api/yellowcard/webhook", { method: "POST", body: raw, headers });
}

const COMPLETED = { sequenceId: REFERENCE, amount: 5000, status: "completed", customerEmail: "ada@example.com" };

beforeEach(() => {
  vi.stubEnv("YELLOWCARD_API_KEY", "yc_key");
  vi.stubEnv("YELLOWCARD_API_SECRET", SECRET);
  vi.stubEnv("YELLOWCARD_API_BASE", "https://api.yellowcard.example");
  admin = {};
  settleBookingCharge.mockClear();
  settleBookingCharge.mockImplementation(async () => ({ outcome: "settled", bookingId: "booking-1" }));
  recordAlert.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/yellowcard/webhook", () => {
  it("settles a signed, completed delivery's booking charge and answers 200", async () => {
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: true });
    expect(settleBookingCharge).toHaveBeenCalledWith(admin, { reference: REFERENCE, amountMinor: 500000, processorFeeMinor: 0 });
  });

  it("answers a repeat delivery 200 without acting again", async () => {
    settleBookingCharge.mockImplementation(async () => ({ outcome: "already-settled", bookingId: "booking-1" }));
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: false });
    expect(recordAlert).not.toHaveBeenCalled();
  });

  it("raises a critical return_needed alert when the collection cannot be applied", async () => {
    settleBookingCharge.mockImplementation(async () => ({
      outcome: "refund-due",
      bookingId: "booking-1",
      reason: "hold_expired",
      amountMinor: 500000,
      reference: REFERENCE,
    }));
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(200);
    expect(recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "webhook.yellowcard.return_needed", severity: "critical" }),
    );
  });

  it("refuses a forged body with 401 and settles nothing", async () => {
    const res = await POST(delivery(COMPLETED, "attacker_secret"));
    expect(res.status).toBe(401);
    expect(settleBookingCharge).not.toHaveBeenCalled();
  });

  it("refuses an unsigned body with 401", async () => {
    const res = await POST(delivery(COMPLETED, null));
    expect(res.status).toBe(401);
    expect(settleBookingCharge).not.toHaveBeenCalled();
  });

  it("answers 500 (stay in the retry queue), not 200, while Yellow Card is unconfigured", async () => {
    vi.stubEnv("YELLOWCARD_API_SECRET", "");
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
    expect(settleBookingCharge).not.toHaveBeenCalled();
  });

  it("answers 500, not 200, when the service role key is missing, and raises a critical alert", async () => {
    admin = null;
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.yellowcard.unconfigured", severity: "critical" }));
  });

  it("answers 500 when the settlement throws, so the delivery is retried", async () => {
    settleBookingCharge.mockImplementation(async () => {
      throw new Error("db down");
    });
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
  });

  it("acknowledges a pending payment without settling it", async () => {
    const res = await POST(delivery({ ...COMPLETED, status: "pending" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: false });
    expect(settleBookingCharge).not.toHaveBeenCalled();
  });

  it("does not settle a reference that is not a crypto collection", async () => {
    const res = await POST(delivery({ ...COMPLETED, sequenceId: "rm-bk-something-else" }));
    expect(res.status).toBe(200);
    expect(settleBookingCharge).not.toHaveBeenCalled();
  });
});
