/**
 * DOC-05: the two signature checks that stand between the public internet and
 * "credit this wallet", run for real. Every webhook route test mocks them to
 * true or false, so until this file a regression that returned true for a
 * forged body (a lost `timingSafeEqual`, an empty key accepted) passed the
 * whole suite.
 */
import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyWebhookSignature as verifyPaystack } from "./paystack";
import { verifyWebhookSignature as verifyYellowCard } from "./yellowcard";

const BODY = JSON.stringify({ event: "charge.success", data: { reference: "rm-bk-1", amount: 500000 } });

afterEach(() => vi.unstubAllEnvs());

describe("Paystack: HMAC-SHA512 of the raw body, hex", () => {
  const sign = (body: string, key = "sk_test_x") => createHmac("sha512", key).update(body, "utf8").digest("hex");

  it("accepts the signature Paystack would send", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY, sign(BODY))).toBe(true);
  });

  it("refuses the same signature over a body with one byte changed", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY.replace("500000", "900000"), sign(BODY))).toBe(false);
  });

  it("refuses a body signed with another key", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY, sign(BODY, "sk_test_attacker"))).toBe(false);
  });

  it("refuses an empty signature, and everything when no key is configured", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY, "")).toBe(false);
    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    expect(verifyPaystack(BODY, sign(BODY, ""))).toBe(false);
  });

  it("refuses a signature that is not hex, or is the wrong length", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY, "z".repeat(128))).toBe(false);
    expect(verifyPaystack(BODY, sign(BODY).slice(0, 64))).toBe(false);
    expect(verifyPaystack(BODY, `${sign(BODY)}00`)).toBe(false);
  });

  it("is case-insensitive in the hex, as Buffer parsing is, and still binds to the body", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_x");
    expect(verifyPaystack(BODY, sign(BODY).toUpperCase())).toBe(true);
  });
});

describe("Yellow Card: HMAC-SHA256 of the raw body, base64", () => {
  const sign = (body: string, key = "yc_secret") => createHmac("sha256", key).update(body, "utf8").digest("base64");

  it("accepts a correct signature and refuses a changed body", () => {
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "yc_secret");
    expect(verifyYellowCard(BODY, sign(BODY))).toBe(true);
    expect(verifyYellowCard(`${BODY} `, sign(BODY))).toBe(false);
  });

  it("refuses another key, an empty signature, a missing secret and a truncated signature", () => {
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "yc_secret");
    expect(verifyYellowCard(BODY, sign(BODY, "other"))).toBe(false);
    expect(verifyYellowCard(BODY, "")).toBe(false);
    expect(verifyYellowCard(BODY, sign(BODY).slice(0, 20))).toBe(false);
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "");
    expect(verifyYellowCard(BODY, sign(BODY, ""))).toBe(false);
  });
});
