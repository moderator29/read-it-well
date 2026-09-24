import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * MON-03 at the route: `transfer.reversed` for a withdrawal that had already
 * completed credits the member back and raises a critical alert; for one that
 * never paid out it is a quiet duplicate.
 */
const paystack = vi.hoisted(() => ({
  isPaystackConfigured: vi.fn(() => true),
  verifyWebhookSignature: vi.fn(() => true),
  verifyTransaction: vi.fn(),
}));
const ledger = vi.hoisted(() => ({
  getAdminClient: vi.fn(() => ({ from: () => ({}) })),
  recordFunding: vi.fn(),
  findUserByEmail: vi.fn(async () => null),
  settleWithdrawal: vi.fn(async () => null),
  walletOwnerId: vi.fn(async () => "user-1"),
  ensureWalletId: vi.fn(async () => "wallet-1"),
  availableBalanceMinor: vi.fn(async () => 0),
}));
const reversal = vi.hoisted(() => ({
  creditReversedWithdrawal: vi.fn(),
  reversalReference: (r: string) => `${r}-reversal`,
}));
const alerts = vi.hoisted(() => ({ recordAlert: vi.fn(async () => ({ ok: true })) }));
const audit = vi.hoisted(() => ({
  recordMoneyAudit: vi.fn(async () => {}),
  recordWebhookDelivery: vi.fn(async () => {}),
}));

vi.mock("@/lib/payments/paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payments/paystack")>();
  return { ...actual, ...paystack };
});
vi.mock("@/lib/wallet/ledger", () => ledger);
vi.mock("@/lib/wallet/withdrawal-reversal", () => reversal);
vi.mock("@/lib/alerts", () => alerts);
vi.mock("@/lib/wallet/audit", () => audit);
vi.mock("@/lib/bookings/settlement", () => ({ settleBookingCharge: vi.fn(), markChargeFailed: vi.fn() }));
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => {}) }));
vi.mock("@/lib/email/client", () => ({ bestEffortEmail: vi.fn(async () => {}), sendMessage: vi.fn(async () => {}) }));
vi.mock("@/lib/email/messages", () => ({ walletFunded: vi.fn(() => ({})), withdrawalFailed: vi.fn(() => ({})) }));
vi.mock("@/lib/email/recipients", () => ({ contactForUser: vi.fn(async () => null) }));

const { POST } = await import("./route");

function reversed(reference: string): Request {
  return new Request("https://vallospaces.com/api/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": "sig", "content-type": "application/json" },
    body: JSON.stringify({ event: "transfer.reversed", data: { reference, amount: 500_000, currency: "NGN" } }),
  });
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  reversal.creditReversedWithdrawal.mockReset();
  alerts.recordAlert.mockClear();
  ledger.settleWithdrawal.mockResolvedValue(null);
});

describe("transfer.reversed after the withdrawal completed (MON-03)", () => {
  it("credits the member back, audits it and raises a critical alert", async () => {
    reversal.creditReversedWithdrawal.mockResolvedValue({ state: "credited", walletId: "w1", amountMinor: 500_000 });
    const res = await POST(reversed("rm-wd-paid"));
    expect(res.status).toBe(200);
    expect(reversal.creditReversedWithdrawal).toHaveBeenCalledWith(expect.anything(), "rm-wd-paid");
    expect(audit.recordMoneyAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "wallet.withdrawal.reversed_after_payout", reference: "rm-wd-paid" }),
    );
    expect(alerts.recordAlert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "wallet.withdrawal_reversed_after_payout", severity: "critical" }),
    );
  });

  it("is a quiet duplicate for a hold that never paid out, and credits nothing", async () => {
    reversal.creditReversedWithdrawal.mockResolvedValue({ state: "not_completed", status: "FAILED" });
    const res = await POST(reversed("rm-wd-failed"));
    expect(res.status).toBe(200);
    expect(alerts.recordAlert).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "wallet.withdrawal_reversed_after_payout" }),
    );
  });

  it("still settles a PENDING hold the ordinary way, without the payout path", async () => {
    ledger.settleWithdrawal.mockResolvedValue({ walletId: "w1", amountMinor: 500_000, metadata: {} } as never);
    await POST(reversed("rm-wd-pending"));
    expect(reversal.creditReversedWithdrawal).not.toHaveBeenCalled();
  });
});
