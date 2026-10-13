import { createHmac } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BILL_AMOUNT_FIXTURE,
  BILL_REFERENCE_FIXTURE,
  billChargeFailed,
  billChargeSuccess,
} from "@/lib/reservations/bill-webhook.fixtures";

/**
 * A RESTAURANT BILL CONFIRMED BY THE WEBHOOK (founder decision D), not only
 * when the diner comes back from Paystack.
 *
 * The signature is checked for real (HMAC SHA-512 of the raw body with the
 * test-mode key, through paystack-mode and the provider seam), so a body
 * signed with another key, or changed after signing, never reaches the
 * database. Past it, a bill goes to `restaurant_bill_settle`, the function the
 * diner's return calls too. The stand-in database below keeps the one rule
 * that makes it idempotent: a paid bill answers `duplicate` and moves nothing.
 * Nothing here calls Paystack.
 */

const KEY = "sk_test_unit_restaurant_bills";
const saved: Record<string, string | undefined> = {};
const ENV = ["PAYSTACK_MODE", "PAYSTACK_SECRET_KEY", "PAYSTACK_TEST_SECRET_KEY", "VERCEL_ENV"] as const;

const db = vi.hoisted(() => ({
  bill: { status: "pending" as "pending" | "paid" | "awaiting_payment", amountMinor: 0, currency: "NGN" },
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  seated: 0,
  failSettle: false,
}));
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

/** The two bill functions, as the live definitions behave (read 13 October 2026). */
const ADMIN = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    db.calls.push({ fn, args });
    if (fn === "restaurant_bill_settle") {
      if (db.failSettle) return { data: null, error: { message: "connection reset" } };
      if (args.p_reference !== BILL_REFERENCE_FIXTURE) return { data: { outcome: "not_found" }, error: null };
      if (db.bill.status === "paid") return { data: { outcome: "duplicate" }, error: null };
      if (args.p_amount_minor !== db.bill.amountMinor || args.p_currency !== db.bill.currency) {
        return { data: { outcome: "mismatch" }, error: null };
      }
      db.bill.status = "paid";
      db.seated += 1;
      return { data: { outcome: "settled" }, error: null };
    }
    if (fn === "restaurant_bill_reopen") {
      if (db.bill.status !== "pending") return { data: "unchanged", error: null };
      db.bill.status = "awaiting_payment";
      return { data: "changed", error: null };
    }
    return { data: null, error: { message: `unexpected ${fn}` } };
  },
  from: () => ({}),
};

function sign(body: string, key = KEY): string {
  return createHmac("sha512", key).update(body, "utf8").digest("hex");
}

function delivery(payload: unknown, opts: { key?: string; tamper?: boolean } = {}): Request {
  const body = JSON.stringify(payload);
  const signature = sign(body, opts.key ?? KEY);
  return new Request("https://vallospaces.com/api/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature, "content-type": "application/json" },
    body: opts.tamper ? body.replace(String(BILL_AMOUNT_FIXTURE), "100") : body,
  });
}

const settles = () => db.calls.filter((call) => call.fn === "restaurant_bill_settle");

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
  db.bill = { status: "pending", amountMinor: BILL_AMOUNT_FIXTURE, currency: "NGN" };
  db.calls = [];
  db.seated = 0;
  db.failSettle = false;
  service.getAdminClient.mockReturnValue(ADMIN);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the signature comes first", () => {
  it("refuses a bill delivery signed with another key, and the database never hears of it", async () => {
    const response = await POST(delivery(billChargeSuccess, { key: "sk_test_somebody_else" }));
    expect(response.status).toBe(401);
    expect(db.calls).toEqual([]);
    expect(db.bill.status).toBe("pending");
  });

  it("refuses a bill delivery changed after it was signed", async () => {
    const response = await POST(delivery(billChargeSuccess, { tamper: true }));
    expect(response.status).toBe(401);
    expect(db.calls).toEqual([]);
  });
});

describe("a bill paid through Vallo", () => {
  it("is settled by the webhook with the charged kobo and currency, and the table is seated", async () => {
    const response = await POST(delivery(billChargeSuccess));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ received: true, reason: "bill_paid" });
    expect(settles()).toEqual([
      {
        fn: "restaurant_bill_settle",
        args: { p_reference: BILL_REFERENCE_FIXTURE, p_amount_minor: BILL_AMOUNT_FIXTURE, p_currency: "NGN" },
      },
    ]);
    expect(db.bill.status).toBe("paid");
    expect(db.seated).toBe(1);
    expect(audit.recordWebhookDelivery).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ reference: BILL_REFERENCE_FIXTURE, outcome: "posted", httpStatus: 200 }),
    );
  });

  it("is idempotent: a replayed delivery is a duplicate and moves nothing", async () => {
    await POST(delivery(billChargeSuccess));
    const again = await POST(delivery(billChargeSuccess));
    expect(again.status).toBe(200);
    await expect(again.json()).resolves.toMatchObject({ received: true, reason: "bill_already_settled" });
    expect(db.seated).toBe(1);
  });

  it("is a duplicate when the diner's return settled it first", async () => {
    db.bill.status = "paid";
    const response = await POST(delivery(billChargeSuccess));
    await expect(response.json()).resolves.toMatchObject({ reason: "bill_already_settled" });
    expect(db.seated).toBe(0);
  });

  it("does not mark a bill paid for the wrong amount, and does not ask for a retry", async () => {
    db.bill.amountMinor = BILL_AMOUNT_FIXTURE + 100;
    const response = await POST(delivery(billChargeSuccess));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reason: "bill_amount_mismatch" });
    expect(db.bill.status).toBe("pending");
  });

  it("asks Paystack to retry when the settle could not be written", async () => {
    db.failSettle = true;
    const response = await POST(delivery(billChargeSuccess));
    expect(response.status).toBe(500);
    expect(db.bill.status).toBe("pending");
  });
});

describe("a bill charge that failed", () => {
  it("reopens the bill so the diner can pay again", async () => {
    const response = await POST(delivery(billChargeFailed));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ reason: "bill_charge_failed" });
    expect(db.bill.status).toBe("awaiting_payment");
  });

  it("cannot unpick a bill that is already paid", async () => {
    db.bill.status = "paid";
    const response = await POST(delivery(billChargeFailed));
    await expect(response.json()).resolves.toMatchObject({ reason: "bill_charge_failed_no_move" });
    expect(db.bill.status).toBe("paid");
  });
});
