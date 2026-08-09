import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Recovering a payment the processor took and the ledger never heard about.
 *
 * This is the capability that exists because it happened: the owner funded
 * their wallet, Paystack reported success, and nothing reached the ledger. The
 * behaviours proved here are the ones that make a recovery path safe to hand to
 * an admin and safe to run on a schedule.
 *
 *  - It must post the credit when the charge really succeeded and the ledger
 *    does not have it.
 *  - It must be SAFE TO RUN REPEATEDLY, and it must be safe because of the
 *    unique reference on wallet_entries rather than because of a second guard
 *    in TypeScript. So the second run still calls recordFunding, and still
 *    reports honestly that nothing moved.
 *  - It must never post for a charge that did not succeed, was not in naira, or
 *    cannot be matched to an account. Money with no home is a job for a human,
 *    and the answer says so instead of guessing.
 */

const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  verifyTransaction: vi.fn(),
  verifyTransfer: vi.fn(),
  listSuccessfulCharges: vi.fn(),
}));

const ledger = vi.hoisted(() => ({
  recordFunding: vi.fn(),
  findUserByEmail: vi.fn(),
  settleWithdrawal: vi.fn(),
  walletOwnerId: vi.fn(),
}));

const audit = vi.hoisted(() => ({ recordMoneyAudit: vi.fn(async () => {}) }));

vi.mock("../payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../payments/paystack")>();
  return { ...actual, ...paystack };
});

vi.mock("./ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ledger")>();
  return { ...actual, ...ledger };
});

vi.mock("./audit", () => audit);

const { reconcileFundingReference } = await import("./reconciliation");
const { FUND_PREFIX } = await import("../payments/references");
const { PaystackError } = await import("../payments/paystack");

import type { AdminClient } from "./ledger";

const REFERENCE = `${FUND_PREFIX}3f2504e0-4f89-11d3-9a0c-0305e82c3301`;
const ADMIN = {} as unknown as AdminClient;
const ACTOR = { kind: "user", userId: "admin-1" } as const;

/** NGN 25,000.00 in kobo, the only unit money is ever counted in here. */
const AMOUNT_MINOR = 2_500_000;

function successfulCharge(overrides?: Record<string, unknown>) {
  return {
    status: "success",
    amountMinor: AMOUNT_MINOR,
    feesMinor: null,
    currency: "NGN",
    reference: REFERENCE,
    paidAt: "2026-08-01T10:00:00.000Z",
    channel: "card",
    gatewayResponse: "Successful",
    customerEmail: null,
    metadata: { user_id: "owner-1", purpose: "wallet_fund" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  paystack.isPaystackConfigured.mockReturnValue(true);
  paystack.verifyTransaction.mockResolvedValue(successfulCharge());
  ledger.recordFunding.mockResolvedValue("posted");
  ledger.findUserByEmail.mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("reconcileFundingReference", () => {
  it("recovers a successful charge the ledger never got", async () => {
    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);

    expect(result.outcome).toBe("recovered");
    expect(result.amountMinor).toBe(AMOUNT_MINOR);
    expect(result.userId).toBe("owner-1");
    expect(ledger.recordFunding).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({
        userId: "owner-1",
        amountMinor: AMOUNT_MINOR,
        reference: REFERENCE,
      }),
    );
  });

  it("passes the kobo figure through untouched, with no arithmetic on the way", async () => {
    // A shortfall of fifty kobo is the kind of thing a division would eat.
    paystack.verifyTransaction.mockResolvedValue(successfulCharge({ amountMinor: 500_050 }));
    await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    const call = ledger.recordFunding.mock.calls[0]?.[1] as { amountMinor: number };
    expect(call.amountMinor).toBe(500_050);
    expect(Number.isInteger(call.amountMinor)).toBe(true);
  });

  it("is safe to run repeatedly, and says so honestly the second time", async () => {
    ledger.recordFunding.mockResolvedValueOnce("posted").mockResolvedValueOnce("duplicate");

    const first = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    const second = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);

    expect(first.outcome).toBe("recovered");
    expect(second.outcome).toBe("already_posted");

    // The second run STILL attempted the write. Idempotency is the unique
    // reference on wallet_entries, deliberately not a read-before-write guard
    // in TypeScript, which would have a race in it.
    expect(ledger.recordFunding).toHaveBeenCalledTimes(2);
  });

  it("trims a reference pasted with whitespace, because it always is", async () => {
    const result = await reconcileFundingReference(ADMIN, `  ${REFERENCE}\n`, ACTOR);
    expect(result.outcome).toBe("recovered");
    expect(result.reference).toBe(REFERENCE);
  });

  it("falls back to the customer email when metadata carries no user_id", async () => {
    // The exact gap that dropped a funding: metadata arrives without a user_id,
    // or arrives stringified and reads as empty.
    paystack.verifyTransaction.mockResolvedValue(
      successfulCharge({ metadata: {}, customerEmail: "someone@example.com" }),
    );
    ledger.findUserByEmail.mockResolvedValue({ id: "owner-2" });

    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);

    expect(result.outcome).toBe("recovered");
    expect(result.userId).toBe("owner-2");
    expect(result.reason).toBe("customer_email");
  });

  it("refuses to guess when the charge cannot be matched to an account", async () => {
    paystack.verifyTransaction.mockResolvedValue(
      successfulCharge({ metadata: {}, customerEmail: null }),
    );

    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);

    expect(result.outcome).toBe("unmatched");
    expect(ledger.recordFunding).not.toHaveBeenCalled();
    // Unmatched money is recorded so a human can find it, never dropped.
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({ action: "wallet.funding.unmatched" }),
    );
  });

  it("does not credit a charge that did not succeed", async () => {
    for (const status of ["failed", "abandoned", "reversed", "pending"]) {
      ledger.recordFunding.mockClear();
      paystack.verifyTransaction.mockResolvedValue(successfulCharge({ status }));
      const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
      expect(result.outcome).toBe("not_successful");
      expect(ledger.recordFunding).not.toHaveBeenCalled();
    }
  });

  it("does not credit a charge that was not in naira", async () => {
    paystack.verifyTransaction.mockResolvedValue(successfulCharge({ currency: "USD" }));
    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    expect(result.outcome).toBe("unmatched");
    expect(result.reason).toBe("currency_not_ngn");
    expect(ledger.recordFunding).not.toHaveBeenCalled();
  });

  it("refuses a reference that is not a wallet funding shape", async () => {
    const result = await reconcileFundingReference(ADMIN, "T123456789", ACTOR);
    expect(result.outcome).toBe("not_ours");
    expect(paystack.verifyTransaction).not.toHaveBeenCalled();
    expect(ledger.recordFunding).not.toHaveBeenCalled();
  });

  it("says unavailable, not failed, when payment keys are missing", async () => {
    paystack.isPaystackConfigured.mockReturnValue(false);
    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    expect(result.outcome).toBe("unavailable");
    expect(result.reason).toBe("paystack_key_missing");
  });

  it("reports a verify failure as failed rather than swallowing it", async () => {
    paystack.verifyTransaction.mockRejectedValue(new PaystackError("gateway timeout", 504));
    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    expect(result.outcome).toBe("failed");
    expect(ledger.recordFunding).not.toHaveBeenCalled();
  });

  it("reports a ledger write failure as failed, never as recovered", async () => {
    // The worst possible lie this function could tell.
    ledger.recordFunding.mockRejectedValue(new Error("connection reset"));
    const result = await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    expect(result.outcome).toBe("failed");
    expect(result.userId).toBe("owner-1");
  });

  it("leaves an audit line naming the admin who recovered the payment", async () => {
    await reconcileFundingReference(ADMIN, REFERENCE, ACTOR);
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      ADMIN,
      expect.objectContaining({
        actor: ACTOR,
        action: "wallet.funding.recovered",
        reference: REFERENCE,
        amountMinor: AMOUNT_MINOR,
        subjectUserId: "owner-1",
      }),
    );
  });
});
