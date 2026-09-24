/**
 * DOC-05: the Yellow Card webhook, which credits wallets, had no handler test.
 * The signature check here is the REAL one (HMAC-SHA256, base64, keyed by
 * YELLOWCARD_API_SECRET); only the ledger, the audit writers, the alert writer
 * and the failure counter are stand-ins.
 */
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordFunding = vi.fn(async (_admin: unknown, _input: unknown): Promise<"posted" | "duplicate"> => "posted");
let admin: object | null = {};
let owner: { id: string } | null = { id: "user-1" };
const recordAlert = vi.fn(async (_input: unknown) => ({ ok: true, id: "a", deduplicated: false }));

vi.mock("@/lib/wallet/ledger", () => ({
  getAdminClient: () => admin,
  findUserByEmail: async () => owner,
  recordFunding: (a: unknown, i: unknown) => recordFunding(a, i),
}));
vi.mock("@/lib/wallet/audit", () => ({ recordMoneyAudit: async () => {}, recordWebhookDelivery: async () => {} }));
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
  owner = { id: "user-1" };
  recordFunding.mockClear();
  recordFunding.mockImplementation(async () => "posted");
  recordAlert.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/yellowcard/webhook", () => {
  it("credits a signed, completed delivery once and answers 200", async () => {
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: true });
    expect(recordFunding).toHaveBeenCalledWith(admin, expect.objectContaining({ userId: "user-1", amountMinor: 500000, reference: REFERENCE }));
  });

  it("refuses a forged body with 401 and credits nothing", async () => {
    const res = await POST(delivery(COMPLETED, "attacker_secret"));
    expect(res.status).toBe(401);
    expect(recordFunding).not.toHaveBeenCalled();
  });

  it("refuses an unsigned body with 401", async () => {
    const res = await POST(delivery(COMPLETED, null));
    expect(res.status).toBe(401);
    expect(recordFunding).not.toHaveBeenCalled();
  });

  it("answers 500 (stay in the retry queue), not 200, while Yellow Card is unconfigured", async () => {
    vi.stubEnv("YELLOWCARD_API_SECRET", "");
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
    expect(recordFunding).not.toHaveBeenCalled();
  });

  it("answers 500, not 200, when the service role key is missing, and raises a critical alert", async () => {
    admin = null;
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "webhook.yellowcard.unconfigured", severity: "critical" }));
  });

  it("answers 500 when the ledger write throws, so the delivery is retried", async () => {
    recordFunding.mockImplementation(async () => {
      throw new Error("db down");
    });
    const res = await POST(delivery(COMPLETED));
    expect(res.status).toBe(500);
  });

  it("acknowledges a pending payment without crediting it", async () => {
    const res = await POST(delivery({ ...COMPLETED, status: "pending" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, acted: false });
    expect(recordFunding).not.toHaveBeenCalled();
  });

  it("does not credit a reference that is not a crypto top-up", async () => {
    const res = await POST(delivery({ ...COMPLETED, sequenceId: "rm-bk-something-else" }));
    expect(res.status).toBe(200);
    expect(recordFunding).not.toHaveBeenCalled();
  });
});
