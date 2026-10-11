import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  rpcs: [] as { fn: string; args: Record<string, unknown> }[],
  settle: { outcome: "settled" } as Record<string, unknown>,
  refunds: [] as string[],
  refundOk: true,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: async () => undefined }));
vi.mock("@/lib/payments/refund", () => ({
  refundChargeToCard: async (_admin: unknown, p: { reference: string }) => {
    state.refunds.push(p.reference);
    return state.refundOk ? { ok: true, refundId: "rf_1" } : { ok: false, reason: "unknown_outcome" };
  },
}));

const admin = {
  rpc: async (fn: string, args: Record<string, unknown>) => {
    state.rpcs.push({ fn, args });
    if (fn === "reservation_deposit_settle") return { data: state.settle, error: null };
    if (fn === "reservation_deposit_close") return { data: "changed", error: null };
    return { data: "changed", error: null };
  },
} as never;

const REF = "rm-dep-0f8fad5b-d9cb-469f-a165-70867728950e";

beforeEach(() => {
  state.rpcs = [];
  state.refunds = [];
  state.settle = { outcome: "settled" };
  state.refundOk = true;
});

describe("the table deposit leg of the Paystack webhook (D75)", () => {
  it("settles through the database with the charged kobo and currency", async () => {
    const { handleDepositChargeSuccess } = await import("./deposit-settlement");
    const v = await handleDepositChargeSuccess(admin, { reference: REF, amount: 3_000_000, currency: "NGN" });
    expect(v).toMatchObject({ outcome: "posted", httpStatus: 200 });
    expect(state.rpcs[0]).toEqual({
      fn: "reservation_deposit_settle",
      args: { p_reference: REF, p_amount_minor: 3_000_000, p_currency: "NGN" },
    });
    expect(state.refunds).toHaveLength(0);
  });

  it("a charge the database cannot apply goes straight back to the card, and is recorded refunded", async () => {
    state.settle = { outcome: "refund-due", reason: "amount_mismatch" };
    const { handleDepositChargeSuccess } = await import("./deposit-settlement");
    const v = await handleDepositChargeSuccess(admin, { reference: REF, amount: 1, currency: "NGN" });
    expect(v.httpStatus).toBe(200);
    expect(state.refunds).toEqual([REF]);
    expect(state.rpcs.map((r) => r.fn)).toContain("reservation_deposit_refunded");
  });

  it("an unknown refund outcome is not recorded refunded (the hourly job and a person take it)", async () => {
    state.settle = { outcome: "refund-due", reason: "time_passed" };
    state.refundOk = false;
    const { handleDepositChargeSuccess } = await import("./deposit-settlement");
    await handleDepositChargeSuccess(admin, { reference: REF, amount: 3_000_000, currency: "NGN" });
    expect(state.rpcs.map((r) => r.fn)).not.toContain("reservation_deposit_refunded");
  });

  it("a settle error asks Paystack to retry; a foreign reference is ignored", async () => {
    const { handleDepositChargeSuccess, handleDepositChargeFailed } = await import("./deposit-settlement");
    state.settle = null as never;
    expect((await handleDepositChargeSuccess(admin, { reference: REF, amount: 3_000_000 })).httpStatus).toBe(500);
    expect((await handleDepositChargeSuccess(admin, { reference: "rm-book-x", amount: 1 })).reason).toBe("not_a_deposit_reference");
    expect(await handleDepositChargeFailed(admin, { reference: REF })).toMatchObject({ reason: "deposit_charge_failed" });
  });
});
