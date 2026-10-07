import { describe, expect, it, vi } from "vitest";

/*
 * THE CONTRACT. Paystack behind the seam passes every call straight through to
 * `paystack.ts` with the same arguments and returns what it returns, so no
 * money outcome can differ by which door a call site uses.
 */
const ps = vi.hoisted(() => ({
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  refundTransaction: vi.fn(),
  listSuccessfulCharges: vi.fn(),
  chargeAuthorization: vi.fn(),
  isPaystackConfigured: vi.fn(() => true),
}));
vi.mock("../paystack", () => ps);

const { paystackProvider, paystackStatus } = await import("./paystack");
const { can, requireCapability, FiatCapabilityMissing } = await import("../provider");
const { fiatProvider, openCheckout } = await import("./index");

describe("paystack behind the fiat seam", () => {
  it("collect and collectWithSplit pass the input through untouched", async () => {
    ps.initializeTransaction.mockResolvedValue({ reference: "r1", authorizationUrl: "https://pay", accessCode: "a" });
    const input = { reference: "r1", amountMinor: 5000, email: "a@b.c", callbackUrl: "https://cb" };
    expect(await paystackProvider.collect(input)).toEqual({ reference: "r1", redirectUrl: "https://pay", accessCode: "a" });
    expect(ps.initializeTransaction).toHaveBeenLastCalledWith(input);
    const split = { listerSubaccount: "ACCT_1", listerShareMinor: 4000, reserveSubaccount: "ACCT_R", guaranteeMinor: 75 };
    await paystackProvider.collectWithSplit({ ...input, split });
    expect(ps.initializeTransaction).toHaveBeenLastCalledWith({ ...input, split });
  });

  it("verifyByReference keeps the provider's own status and amount", async () => {
    ps.verifyTransaction.mockResolvedValue({ reference: "r1", status: "abandoned", amountMinor: 5000, paidAt: null });
    expect(await paystackProvider.verifyByReference("r1")).toEqual({
      reference: "r1", status: "pending", providerStatus: "abandoned", amountMinor: 5000, paidAt: null,
    });
    expect(ps.verifyTransaction).toHaveBeenLastCalledWith("r1");
  });

  it("maps every Paystack status, and never maps an in-flight one to failed", () => {
    expect(paystackStatus("success")).toBe("success");
    expect(paystackStatus("failed")).toBe("failed");
    // An abandoned checkout can still be paid: never final.
    expect(paystackStatus("abandoned")).toBe("pending");
    expect(paystackStatus("reversed")).toBe("reversed");
    for (const s of ["ongoing", "pending", "processing", "queued"] as const) expect(paystackStatus(s)).toBe("pending");
  });

  it("reads the signature from Paystack's own header over the raw body", () => {
    ps.verifyWebhookSignature.mockReturnValue(true);
    const headers = new Headers({ "x-paystack-signature": "abc" });
    expect(paystackProvider.verifyWebhook("{raw}", headers)).toBe(true);
    expect(ps.verifyWebhookSignature).toHaveBeenLastCalledWith("{raw}", "abc");
    paystackProvider.verifyWebhook("{raw}", new Headers());
    expect(ps.verifyWebhookSignature).toHaveBeenLastCalledWith("{raw}", "");
  });

  it("refund, the charge list, the saved-card charge and the full record reach the existing functions with the same arguments and answers", async () => {
    ps.refundTransaction.mockResolvedValue({ refundId: "rf", status: "pending" });
    const refundIn = { reference: "r1", amountMinor: 10 };
    expect(await paystackProvider.refund(refundIn)).toEqual({ refundId: "rf", status: "pending" });
    expect(ps.refundTransaction).toHaveBeenLastCalledWith(refundIn);
    ps.listSuccessfulCharges.mockResolvedValue([{ reference: "c1" }]);
    expect(await paystackProvider.listSuccessfulCharges({ from: "2026-10-01" })).toEqual([{ reference: "c1" }]);
    expect(ps.listSuccessfulCharges).toHaveBeenLastCalledWith({ from: "2026-10-01" });
    const charged = { status: "success", reference: "r2", amountMinor: 5, gatewayResponse: null, authorization: null };
    ps.chargeAuthorization.mockResolvedValue(charged);
    const chargeIn = { authorizationCode: "AUTH", email: "a@b.c", amountMinor: 5, reference: "r2" };
    expect(await paystackProvider.chargeSavedCard(chargeIn)).toBe(charged);
    expect(ps.chargeAuthorization).toHaveBeenLastCalledWith(chargeIn);
    const record = { reference: "r3", status: "abandoned" };
    ps.verifyTransaction.mockResolvedValue(record);
    expect(await paystackProvider.verifyRecord("r3")).toBe(record);
  });

  it("openCheckout splits only when given a split, and hands back the checkout handle", async () => {
    ps.initializeTransaction.mockResolvedValue({ reference: "r1", authorizationUrl: "https://pay", accessCode: "a" });
    const input = { reference: "r1", amountMinor: 5000, email: "a@b.c", callbackUrl: "https://cb", channels: ["card"] };
    expect(await openCheckout(fiatProvider("paystack")!, input)).toEqual({ reference: "r1", authorizationUrl: "https://pay", accessCode: "a" });
    expect(ps.initializeTransaction).toHaveBeenLastCalledWith(input);
  });

  it("declares what it can do, and narrows only on what it declared", () => {
    const p = fiatProvider("paystack")!;
    expect(can(p, "split_at_charge")).toBe(true);
    expect(can(p, "refund_without_dispute")).toBe(true);
    expect(can(p, "hold_in_escrow")).toBe(false);
    expect(() => requireCapability(p, "hold_in_escrow")).toThrow(FiatCapabilityMissing);
    // @ts-expect-error: not narrowed, so the split method is not on the type.
    void p.collectWithSplit;
    if (can(p, "split_at_charge")) expect(typeof p.collectWithSplit).toBe("function");
    // A member balance is the provider-held rail's, never Paystack's.
    expect(can(p, "member_wallet")).toBe(false);
  });
});
