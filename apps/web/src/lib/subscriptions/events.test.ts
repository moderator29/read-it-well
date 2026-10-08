import { describe, expect, it } from "vitest";
import { emailSha256, isSubscriptionCharge, isSubscriptionReference, readSubscriptionEvent } from "./events";

const REF = "rm-sub-3f2504e0-4f89-11d3-9a0c-0305e82c3301";

/* Shapes as Paystack documents its webhook payloads (trimmed). */
const firstCharge = {
  id: 302961,
  reference: REF,
  amount: 950000,
  currency: "NGN",
  status: "success",
  paid_at: "2026-10-08T10:00:00.000Z",
  customer: { customer_code: "CUS_abc123", email: "Ada@Example.com" },
  plan: { plan_code: "PLN_pro123", name: "Vallo Pro monthly", interval: "monthly" },
  authorization: { authorization_code: "AUTH_secret", last4: "4081", signature: "SIG_x" },
  metadata: { kind: "subscription" },
};

describe("which charges are subscriptions", () => {
  it("knows our own checkout reference and a renewal charged under a plan", () => {
    expect(isSubscriptionReference(REF)).toBe(true);
    expect(isSubscriptionReference("rm-promo-3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(false);
    expect(isSubscriptionCharge(firstCharge)).toBe(true);
    expect(isSubscriptionCharge({ reference: "T1234abcd", plan: { plan_code: "PLN_pro123" } })).toBe(true);
    expect(isSubscriptionCharge({ reference: "T1234abcd", plan: {} })).toBe(false);
    expect(isSubscriptionCharge({ reference: "rm-book-3f2504e0-4f89-11d3-9a0c-0305e82c3301", plan: null })).toBe(false);
  });
});

describe("readSubscriptionEvent", () => {
  it("keys a charge by its reference and keeps codes and kobo, never the card or the address", () => {
    const read = readSubscriptionEvent("charge.success", firstCharge);
    expect(read).not.toBeNull();
    expect(read!.eventKey).toBe(`charge.success:${REF}`);
    expect(read!.data).toEqual({
      reference: REF,
      amount_minor: 950000,
      currency: "NGN",
      paid_at: "2026-10-08T10:00:00.000Z",
      plan_code: "PLN_pro123",
      provider_status: "success",
      customer_code: "CUS_abc123",
      email_sha256: emailSha256("ada@example.com"),
    });
    const flat = JSON.stringify(read);
    expect(flat).not.toMatch(/AUTH_secret|4081|SIG_x|example\.com/i);
  });

  it("hashes the email lowercased, so the checkout's hash matches Paystack's spelling", () => {
    expect(emailSha256(" Ada@Example.COM ")).toBe(emailSha256("ada@example.com"));
    expect(emailSha256("ada@example.com")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores a charge that is not a subscription's", () => {
    expect(readSubscriptionEvent("charge.success", { reference: "rm-book-x", plan: {} })).toBeNull();
  });

  it("keys subscription.create by its code, with the token and next payment date", () => {
    const read = readSubscriptionEvent("subscription.create", {
      status: "active",
      subscription_code: "SUB_vbdx",
      email_token: "tok_d7gofp6",
      amount: 950000,
      next_payment_date: "2026-11-08T10:00:00.000Z",
      plan: { plan_code: "PLN_pro123" },
      customer: { customer_code: "CUS_abc123", email: "ada@example.com" },
      createdAt: "2026-10-08T10:00:01.000Z",
    });
    expect(read!.eventKey).toBe("subscription.create:SUB_vbdx");
    expect(read!.data).toMatchObject({
      subscription_code: "SUB_vbdx",
      email_token: "tok_d7gofp6",
      plan_code: "PLN_pro123",
      next_payment_date: "2026-11-08T10:00:00.000Z",
      customer_code: "CUS_abc123",
      provider_status: "active",
    });
  });

  it("tells two not_renew deliveries apart by Paystack's update time, and a redelivery not at all", () => {
    const a = readSubscriptionEvent("subscription.not_renew", { subscription_code: "SUB_vbdx", updatedAt: "2026-10-20T08:00:00Z" });
    const again = readSubscriptionEvent("subscription.not_renew", { subscription_code: "SUB_vbdx", updatedAt: "2026-10-20T08:00:00Z" });
    const later = readSubscriptionEvent("subscription.not_renew", { subscription_code: "SUB_vbdx", updatedAt: "2026-12-01T08:00:00Z" });
    expect(a!.eventKey).toBe(again!.eventKey);
    expect(a!.eventKey).not.toBe(later!.eventKey);
  });

  it("keys invoice.update by its code and status, and reads the subscription's next charge", () => {
    const body = {
      invoice_code: "INV_thy2",
      amount: 950000,
      period_start: "2026-11-08T10:00:00.000Z",
      period_end: "2026-12-08T10:00:00.000Z",
      status: "success",
      paid: true,
      subscription: { subscription_code: "SUB_vbdx", next_payment_date: "2026-12-08T10:00:00.000Z" },
      transaction: { reference: "T999xyz", status: "success", currency: "NGN" },
      customer: { customer_code: "CUS_abc123" },
    };
    const read = readSubscriptionEvent("invoice.update", body);
    expect(read!.eventKey).toBe("invoice.update:INV_thy2:success");
    expect(read!.data).toMatchObject({
      invoice_code: "INV_thy2",
      subscription_code: "SUB_vbdx",
      next_payment_date: "2026-12-08T10:00:00.000Z",
      period_end: "2026-12-08T10:00:00.000Z",
      paid: true,
      provider_status: "success",
      reference: "T999xyz",
      currency: "NGN",
    });
    expect(readSubscriptionEvent("invoice.update", { ...body, status: "failed", paid: false })!.eventKey).toBe(
      "invoice.update:INV_thy2:failed",
    );
    expect(readSubscriptionEvent("invoice.payment_failed", { ...body, status: "failed" })!.eventKey).toBe(
      "invoice.payment_failed:INV_thy2",
    );
  });

  it("refuses what cannot be named, and never passes a malformed date on", () => {
    expect(readSubscriptionEvent("subscription.disable", { subscription_code: "not-a-code" })).toBeNull();
    expect(readSubscriptionEvent("invoice.create", { amount: 1 })).toBeNull();
    expect(readSubscriptionEvent("transfer.success", { reference: REF })).toBeNull();
    const read = readSubscriptionEvent("subscription.create", { subscription_code: "SUB_x", next_payment_date: "soon" });
    expect(read!.data.next_payment_date).toBeUndefined();
  });
});
