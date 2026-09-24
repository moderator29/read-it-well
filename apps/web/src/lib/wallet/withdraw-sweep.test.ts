import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MON-01, the stale withdrawal sweep. A 404 from Paystack releases a hold only
 * once the hold is old enough that the 404 cannot be read-after-write lag or
 * a timed-out initiate that was in fact accepted; and a hold still PENDING
 * after a day raises one operator alert.
 */
const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  verifyTransfer: vi.fn(),
}));
const ledger = vi.hoisted(() => ({
  settleWithdrawal: vi.fn(async (_admin: unknown, reference: string) => ({
    walletId: "w1",
    amountMinor: 500_000,
    reference,
  })),
  walletOwnerId: vi.fn(async () => "user-1"),
}));
const alerts = vi.hoisted(() => ({ recordAlert: vi.fn(async () => ({ ok: true })) }));

vi.mock("../payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../payments/paystack")>();
  return { ...actual, ...paystack };
});
vi.mock("./ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ledger")>();
  return { ...actual, ...ledger };
});
vi.mock("./audit", () => ({ recordMoneyAudit: vi.fn(async () => {}) }));
vi.mock("../alerts/record", () => alerts);
vi.mock("../bookings/settlement", () => ({ settleBookingCharge: vi.fn() }));

const {
  sweepStaleWithdrawalHolds,
  NEVER_STARTED_MIN_AGE_MINUTES,
  WITHDRAWAL_STUCK_ALERT_MINUTES,
} = await import("./reconciliation");
const { PaystackError } = await import("../payments/paystack");

function adminWith(holds: Array<{ reference: string; ageMinutes: number }>) {
  const rows = holds.map((h) => ({
    reference: h.reference,
    wallet_id: "w1",
    amount_minor: 500_000,
    created_at: new Date(Date.now() - h.ageMinutes * 60_000).toISOString(),
  }));
  const chain = {
    select: () => chain,
    eq: () => chain,
    lt: () => chain,
    order: () => chain,
    limit: async () => ({ data: rows, error: null }),
  };
  return { from: () => chain } as never;
}

const notFound = () => new PaystackError("Transfer not found", 404);

beforeEach(() => {
  paystack.verifyTransfer.mockReset();
  ledger.settleWithdrawal.mockClear();
  alerts.recordAlert.mockClear();
});

describe("the never-started rule", () => {
  it("waits far longer than Paystack's read-after-write lag before trusting a 404", () => {
    expect(NEVER_STARTED_MIN_AGE_MINUTES).toBeGreaterThanOrEqual(30);
  });

  it("leaves a young hold pending on a 404, even when the sweep is asked to start at five minutes", async () => {
    paystack.verifyTransfer.mockRejectedValue(notFound());
    const report = await sweepStaleWithdrawalHolds(adminWith([{ reference: "wd-young", ageMinutes: 10 }]), {
      olderThanMinutes: 5,
      apply: true,
    });
    expect(report.resolutions[0]).toMatchObject({ action: "left_pending", reason: "transfer_not_yet_readable" });
    expect(ledger.settleWithdrawal).not.toHaveBeenCalled();
  });

  it("releases a hold Paystack still does not know once it is old enough", async () => {
    paystack.verifyTransfer.mockRejectedValue(notFound());
    const report = await sweepStaleWithdrawalHolds(
      adminWith([{ reference: "wd-orphan", ageMinutes: NEVER_STARTED_MIN_AGE_MINUTES + 15 }]),
      { apply: true },
    );
    expect(report.resolutions[0]).toMatchObject({ action: "released", reason: "transfer_never_started" });
    expect(ledger.settleWithdrawal).toHaveBeenCalledWith(expect.anything(), "wd-orphan", "FAILED");
  });
});

describe("a withdrawal stuck for a day", () => {
  it("raises one critical alert naming the reference, and still moves nothing", async () => {
    paystack.verifyTransfer.mockResolvedValue({ status: "pending" });
    await sweepStaleWithdrawalHolds(
      adminWith([
        { reference: "wd-stuck", ageMinutes: WITHDRAWAL_STUCK_ALERT_MINUTES + 60 },
        { reference: "wd-recent", ageMinutes: 120 },
      ]),
      { apply: true },
    );
    expect(alerts.recordAlert).toHaveBeenCalledTimes(1);
    expect(alerts.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "wallet.withdrawal_stuck", severity: "critical", subjectId: "wd-stuck" }),
    );
    expect(ledger.settleWithdrawal).not.toHaveBeenCalled();
  });

  it("alerts too when Paystack cannot be asked about a day-old hold", async () => {
    paystack.verifyTransfer.mockRejectedValue(new PaystackError("Bad gateway", 502));
    await sweepStaleWithdrawalHolds(
      adminWith([{ reference: "wd-dark", ageMinutes: WITHDRAWAL_STUCK_ALERT_MINUTES + 1 }]),
      { apply: true },
    );
    expect(alerts.recordAlert).toHaveBeenCalledWith(expect.objectContaining({ subjectId: "wd-dark" }));
  });
});
