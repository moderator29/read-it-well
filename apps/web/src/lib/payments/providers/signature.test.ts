import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/* The real verifier through the seam: a true signature passes, a mangled body or signature fails. */
const KEY = "sk_test_seam_signature_probe_key";
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = { mode: process.env.PAYSTACK_MODE, test: process.env.PAYSTACK_TEST_SECRET_KEY };
  process.env.PAYSTACK_MODE = "test";
  process.env.PAYSTACK_TEST_SECRET_KEY = KEY;
});
afterEach(() => {
  process.env.PAYSTACK_MODE = saved.mode;
  process.env.PAYSTACK_TEST_SECRET_KEY = saved.test;
});

describe("paystack webhook signature through the seam", () => {
  it("accepts the true HMAC and refuses a replayed body that was altered", async () => {
    const { paystackProvider } = await import("./paystack");
    const body = '{"event":"charge.success","data":{"reference":"r1","amount":5000}}';
    const sig = createHmac("sha512", KEY).update(body, "utf8").digest("hex");
    expect(paystackProvider.verifyWebhook(body, new Headers({ "x-paystack-signature": sig }))).toBe(true);
    expect(paystackProvider.verifyWebhook(body.replace("5000", "9000"), new Headers({ "x-paystack-signature": sig }))).toBe(false);
    expect(paystackProvider.verifyWebhook(body, new Headers({ "x-paystack-signature": sig.slice(0, -2) + "00" }))).toBe(false);
    expect(paystackProvider.verifyWebhook(body, new Headers())).toBe(false);
  });
});
