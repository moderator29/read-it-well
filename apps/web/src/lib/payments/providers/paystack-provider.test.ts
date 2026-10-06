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
  isPaystackConfigured: vi.fn(() => true),
}));
vi.mock("../paystack", () => ps);

const { paystackProvider, paystackStatus } = await import("./paystack");
const { can, requireCapability, FiatCapabilityMissing } = await import("../provider");
const { fiatProvider } = await import("./index");

describe("paystack behind the fiat seam", () => {
  it("collect and collectWithSplit pass the input through untouched", async () => {
    ps.initializeTransaction.mockResolvedValue({ reference: "r1", authorizationUrl: "https://pay", accessCode: "a" });
    const input = { reference: "r1", amountMinor: 5000, email: "a@b.c", callbackUrl: "https://cb" };
    expect(await paystackProvider.collect(input)).toEqual({ reference: "r1", redirectUrl: "https://pay" });
    expect(ps.initializeTransaction).toHaveBeenLastCalledWith(input);
    const split = { listerSubaccount: "ACCT_1", listerShareMinor: 4000, reserveSubaccount: "ACCT_R", guaranteeMinor: 75 };
    await paystackProvider.collectWithSplit({ ...input, split });
    expect(ps.initializeTransaction).toHaveBeenLastCalledWith({ ...input, split });
  });

  it("verifyByReference keeps the provider's own status and amount", async () => {
    ps.verifyTransaction.mockResolvedValue({ reference: "r1", status: "abandoned", amountMinor: 5000, paidAt: null });
    expect(await paystackProvider.verifyByReference("r1")).toEqual({
      reference: "r1", status: "failed", providerStatus: "abandoned", amountMinor: 5000, paidAt: null,
    });
    expect(ps.verifyTransaction).toHaveBeenLastCalledWith("r1");
  });

  it("maps every Paystack status, and never maps an in-flight one to failed", () => {
    expect(paystackStatus("success")).toBe("success");
    expect(paystackStatus("failed")).toBe("failed");
    expect(paystackStatus("abandoned")).toBe("failed");
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

  it("refund and the charge list are the existing functions themselves", () => {
    expect(paystackProvider.refund).toBe(ps.refundTransaction);
    expect(paystackProvider.listSuccessfulCharges).toBe(ps.listSuccessfulCharges);
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
    expect(fiatProvider("payluk")).toBeNull();
  });
});
