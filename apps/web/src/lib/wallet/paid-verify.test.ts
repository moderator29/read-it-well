import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NEW-A2-05. The daily re-check of paid withdrawals: a COMPLETED withdrawal
 * that Paystack now reports reversed is credited back once, with the same
 * audit and critical alert the `transfer.reversed` webhook raises, and one
 * that already has its reversal credit is not asked about again.
 */
const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  verifyTransfer: vi.fn(),
}));
const reversal = vi.hoisted(() => ({
  creditReversedWithdrawal: vi.fn(async () => ({
    state: "credited" as const,
    walletId: "w1",
    amountMinor: 500_000,
  })),
}));
const alerts = vi.hoisted(() => ({ recordAlert: vi.fn(async () => ({ ok: true })) }));
const audit = vi.hoisted(() => ({ recordMoneyAudit: vi.fn(async () => {}) }));

vi.mock("../payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../payments/paystack")>();
  return { ...actual, ...paystack };
});
vi.mock("./withdrawal-reversal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./withdrawal-reversal")>();
  return { ...actual, ...reversal };
});
vi.mock("./ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ledger")>();
  return { ...actual, walletOwnerId: vi.fn(async () => "user-1") };
});
vi.mock("./audit", () => audit);
vi.mock("../alerts/record", () => alerts);
vi.mock("../bookings/settlement", () => ({ settleBookingCharge: vi.fn() }));

const { verifyPaidWithdrawals, isPaidVerifyHour } = await import("./reconciliation");

function adminWith(paid: string[], credited: string[] = []) {
  const paidRows = paid.map((reference) => ({ reference, amount_minor: 500_000 }));
  const paidChain = {
    select: () => paidChain,
    eq: () => paidChain,
    gte: () => paidChain,
    order: () => paidChain,
    limit: async () => ({ data: paidRows, error: null }),
  };
  const creditedChain = {
    in: async () => ({ data: credited.map((reference) => ({ reference })), error: null }),
  };
  let call = 0;
  return {
    from: () => ({
      select: (columns: string) => {
        call += 1;
        return call === 1 && columns.includes("amount_minor") ? paidChain : creditedChain;
      },
    }),
  } as never;
}

beforeEach(() => {
  paystack.verifyTransfer.mockReset();
  reversal.creditReversedWithdrawal.mockClear();
  alerts.recordAlert.mockClear();
  audit.recordMoneyAudit.mockClear();
});

describe("verifyPaidWithdrawals", () => {
  it("credits a paid withdrawal Paystack now reports reversed, and raises the critical alert", async () => {
    paystack.verifyTransfer.mockImplementation(async (reference: string) => ({
      status: reference === "wd-back" ? "reversed" : "success",
      amountMinor: 500_000,
      reference,
    }));
    const report = await verifyPaidWithdrawals(adminWith(["wd-ok", "wd-back"]), { apply: true });

    expect(report.checked).toBe(2);
    expect(report.reversed).toEqual([{ reference: "wd-back", amountMinor: 500_000, credited: true }]);
    expect(reversal.creditReversedWithdrawal).toHaveBeenCalledTimes(1);
    expect(reversal.creditReversedWithdrawal).toHaveBeenCalledWith(expect.anything(), "wd-back");
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "wallet.withdrawal.reversed_after_payout", reference: "wd-back" }),
    );
    expect(alerts.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "wallet.withdrawal_reversed_after_payout",
        severity: "critical",
        subjectId: "wd-back",
      }),
    );
  });

  it("does not ask again about a withdrawal whose reversal is already credited", async () => {
    paystack.verifyTransfer.mockResolvedValue({ status: "reversed", amountMinor: 500_000, reference: "wd-back" });
    const report = await verifyPaidWithdrawals(adminWith(["wd-back"], ["wd-back-reversal"]), { apply: true });
    expect(report.checked).toBe(0);
    expect(paystack.verifyTransfer).not.toHaveBeenCalled();
    expect(reversal.creditReversedWithdrawal).not.toHaveBeenCalled();
  });

  it("only reports on a dry run", async () => {
    paystack.verifyTransfer.mockResolvedValue({ status: "reversed", amountMinor: 500_000, reference: "wd-back" });
    const report = await verifyPaidWithdrawals(adminWith(["wd-back"]));
    expect(report.reversed).toEqual([{ reference: "wd-back", amountMinor: 500_000, credited: false }]);
    expect(reversal.creditReversedWithdrawal).not.toHaveBeenCalled();
    expect(alerts.recordAlert).not.toHaveBeenCalled();
  });

  it("counts a Paystack failure instead of stopping the run", async () => {
    paystack.verifyTransfer.mockImplementation(async (reference: string) => {
      if (reference === "wd-a") throw new Error("timeout");
      return { status: "success", amountMinor: 500_000, reference };
    });
    const report = await verifyPaidWithdrawals(adminWith(["wd-a", "wd-b"]), { apply: true });
    expect(report).toMatchObject({ checked: 2, failures: 1, reversed: [] });
  });
});

describe("isPaidVerifyHour", () => {
  it("runs once a day, at midnight in Lagos", () => {
    expect(isPaidVerifyHour(new Date("2026-09-24T23:10:00Z"))).toBe(true);
    expect(isPaidVerifyHour(new Date("2026-09-24T22:10:00Z"))).toBe(false);
    expect(isPaidVerifyHour(new Date("2026-09-24T00:10:00Z"))).toBe(false);
  });
});
