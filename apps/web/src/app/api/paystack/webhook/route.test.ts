import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The status codes, which is where the money was actually lost.
 *
 * Every failure branch of this route used to answer HTTP 200. Paystack reads
 * 200 as "we have it, never send it again", so when SUPABASE_SERVICE_ROLE_KEY
 * was missing from the production runtime, getAdminClient() returned null, this
 * route said 200, the delivery log went green, no retry ever came, and a real
 * funding was lost permanently with no line anywhere to say so.
 *
 * These tests are about one thing: a delivery that we did not successfully
 * process must NOT be acknowledged. Everything else in this file is a detail;
 * this is the invariant.
 */

const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  verifyWebhookSignature: vi.fn(() => true),
  verifyTransaction: vi.fn(),
}));

/*
 * The mocks are typed against the REAL return types rather than against their
 * default implementations.
 *
 * `vi.fn(async () => "posted" as const)` infers Promise<"posted">, so the
 * duplicate test could not say mockResolvedValue("duplicate") and the
 * unmatched-funding test could not say mockResolvedValue({ id: "owner-2" }):
 * both were type errors against a mock that was narrower than the function it
 * stands in for. Naming the real shapes here is what lets a test set up the
 * case it is actually about.
 */
const ledger = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  recordFunding: vi.fn(async (): Promise<FundingOutcome> => "posted"),
  findUserByEmail: vi.fn(async (): Promise<LedgerUser> => null),
  settleWithdrawal: vi.fn(async () => null),
  walletOwnerId: vi.fn(async () => null),
  ensureWalletId: vi.fn(async () => "wallet-1"),
  availableBalanceMinor: vi.fn(async () => 0),
}));

const audit = vi.hoisted(() => ({
  recordMoneyAudit: vi.fn(async () => {}),
  recordWebhookDelivery: vi.fn(async () => {}),
}));

const settlement = vi.hoisted(() => ({
  settleBookingCharge: vi.fn(),
  markChargeFailed: vi.fn(async () => {}),
}));

vi.mock("@/lib/payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/paystack")>();
  return { ...actual, ...paystack };
});
vi.mock("@/lib/wallet/ledger", () => ledger);
vi.mock("@/lib/wallet/audit", () => audit);
vi.mock("@/lib/bookings/settlement", () => settlement);
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => {}) }));
vi.mock("@/lib/email/client", () => ({
  bestEffortEmail: vi.fn(async () => {}),
  sendMessage: vi.fn(async () => {}),
}));
vi.mock("@/lib/email/messages", () => ({
  walletFunded: vi.fn(() => ({})),
  withdrawalFailed: vi.fn(() => ({})),
}));
vi.mock("@/lib/email/recipients", () => ({ contactForUser: vi.fn(async () => null) }));

const { POST } = await import("./route");

const FUND_REFERENCE = "rm-fund-3f2504e0-4f89-11d3-9a0c-0305e82c3301";
const AMOUNT_MINOR = 2_500_000;

/** A stand-in admin client. Nothing in these tests reaches a real query. */
const ADMIN = { from: () => ({}) };

function delivery(body: unknown, signature = "a-valid-looking-signature"): Request {
  return new Request("https://rentme.ng/api/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": signature, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function chargeSuccess(metadata: unknown) {
  return {
    event: "charge.success",
    data: {
      reference: FUND_REFERENCE,
      amount: AMOUNT_MINOR,
      currency: "NGN",
      channel: "card",
      paid_at: "2026-08-01T10:00:00.000Z",
      metadata,
    },
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  paystack.isPaystackConfigured.mockReturnValue(true);
  paystack.verifyWebhookSignature.mockReturnValue(true);
  ledger.getAdminClient.mockReturnValue(ADMIN);
  ledger.recordFunding.mockResolvedValue("posted");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("the branch that lost the money", () => {
  it("answers 503, NOT 200, when the service role key is missing", async () => {
    ledger.getAdminClient.mockReturnValue(null);

    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    // 200 here is what told Paystack never to retry. 503 is a temporary
    // failure on our side, which it does retry, so the credit posts itself the
    // moment the key is set.
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      received: false,
      reason: "service_role_key_missing",
    });
  });

  it("says so on the money channel, with a reason that names the cause", async () => {
    ledger.getAdminClient.mockReturnValue(null);
    const warn = vi.spyOn(console, "warn");

    await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("service_role_key_missing"));
  });

  it("answers 500, NOT 200, when a write throws", async () => {
    ledger.recordFunding.mockRejectedValue(new Error("connection reset"));

    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    // The old code caught this and returned 200. Money in an unknown state and
    // a processor told never to try again is exactly how a credit is lost.
    expect(response.status).toBe(500);
  });
});

describe("authentication and shape", () => {
  it("refuses an unverifiable signature with 401 and writes nothing", async () => {
    paystack.verifyWebhookSignature.mockReturnValue(false);

    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    expect(response.status).toBe(401);
    expect(ledger.recordFunding).not.toHaveBeenCalled();
    // Nothing is persisted before the signature verifies, or this endpoint is a
    // free write surface into audit_log for anybody who finds the URL.
    expect(audit.recordWebhookDelivery).not.toHaveBeenCalled();
  });

  it("answers 503 when the Paystack key is missing, because nothing can be verified", async () => {
    paystack.isPaystackConfigured.mockReturnValue(false);
    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));
    expect(response.status).toBe(503);
  });

  it("answers 400 for a body that is not JSON", async () => {
    const response = await POST(delivery("not json at all"));
    expect(response.status).toBe(400);
  });
});

describe("funding", () => {
  it("credits a funding whose metadata is an OBJECT", async () => {
    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    expect(response.status).toBe(200);
    expect(ledger.recordFunding).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({
        userId: "owner-1",
        amountMinor: AMOUNT_MINOR,
        reference: FUND_REFERENCE,
      }),
    );
  });

  it("credits a funding whose metadata arrived as a JSON STRING", async () => {
    // The silent drop: metadataRecord() accepted objects only, so a stringified
    // metadata yielded no user_id and the funding vanished with no trace.
    const response = await POST(
      delivery(chargeSuccess(JSON.stringify({ user_id: "owner-1", purpose: "wallet_fund" }))),
    );

    expect(response.status).toBe(200);
    expect(ledger.recordFunding).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ userId: "owner-1", amountMinor: AMOUNT_MINOR }),
    );
  });

  it("falls back to the customer email when metadata carries no user_id", async () => {
    ledger.findUserByEmail.mockResolvedValue({ id: "owner-2" });
    const body = chargeSuccess({});
    const withCustomer = {
      ...body,
      data: { ...body.data, customer: { email: "someone@example.com" } },
    };

    const response = await POST(delivery(withCustomer));

    expect(response.status).toBe(200);
    expect(ledger.recordFunding).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ userId: "owner-2" }),
    );
  });

  it("records an unmatched funding rather than dropping it in silence", async () => {
    paystack.verifyTransaction.mockRejectedValue(new Error("no such transaction"));

    const response = await POST(delivery(chargeSuccess({})));

    expect(response.status).toBe(200);
    expect(ledger.recordFunding).not.toHaveBeenCalled();
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ action: "wallet.funding.unmatched" }),
    );
  });

  it("does not credit a charge that was not in naira", async () => {
    const body = chargeSuccess({ user_id: "owner-1" });
    const foreign = { ...body, data: { ...body.data, currency: "USD" } };

    const response = await POST(delivery(foreign));

    expect(response.status).toBe(200);
    expect(ledger.recordFunding).not.toHaveBeenCalled();
  });

  it("treats a replayed delivery as a duplicate and emails nobody twice", async () => {
    ledger.recordFunding.mockResolvedValue("duplicate");
    const response = await POST(delivery(chargeSuccess({ user_id: "owner-1" })));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reason: expect.stringContaining("already_in_ledger"),
    });
  });
});

describe("the delivery record", () => {
  it("persists what Paystack sent and what we did with it", async () => {
    await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    expect(audit.recordWebhookDelivery).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({
        event: "charge.success",
        reference: FUND_REFERENCE,
        amountMinor: AMOUNT_MINOR,
        outcome: "posted",
        httpStatus: 200,
      }),
    );
  });

  it("persists the failures too, which is the point", async () => {
    ledger.recordFunding.mockRejectedValue(new Error("connection reset"));

    await POST(delivery(chargeSuccess({ user_id: "owner-1" })));

    expect(audit.recordWebhookDelivery).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ outcome: "failed", httpStatus: 500 }),
    );
  });

  it("records an event it does not handle as ignored rather than silently", async () => {
    await POST(delivery({ event: "customer.identification.failed", data: { reference: "x" } }));

    expect(audit.recordWebhookDelivery).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ outcome: "ignored", httpStatus: 200 }),
    );
  });
});
