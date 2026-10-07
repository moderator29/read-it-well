import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  PaylukRateGate,
  createCustomer,
  createIntent,
  failureKindFor,
  findCustomerByEmail,
  findTransaction,
  getBalance,
  getBankList,
  intentBody,
  koboToNaira,
  nairaToKobo,
  needsOtp,
  parseHosted,
  verifyAccount,
  verifyIntent,
  type PaylukContext,
  type PaylukFetch,
} from "./payluk-client";
import { environmentMatches, parsePaylukWebhook, verifyPaylukSignature } from "./payluk-webhook";

/*
 * Every response body below is copied from Payluk's own reference pages in
 * docs/payments/payluk-source/ (the `api-reference_*` files), so these tests
 * pin the adapter to the documented shapes, not to a guess.
 */

type Call = { url: string; method: string; headers: Record<string, string>; body: unknown };

function harness(answers: Array<{ status: number; body?: unknown; rate?: string } | "network">, now = () => 0) {
  const calls: Call[] = [];
  let i = 0;
  const fetch: PaylukFetch = async (url, init) => {
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body instanceof FormData ? Object.fromEntries(init.body) : undefined;
    calls.push({ url, method: init.method, headers: init.headers, body });
    const a = answers[Math.min(i++, answers.length - 1)]!;
    if (a === "network") throw new Error("socket hang up");
    return {
      status: a.status,
      headers: { get: (n: string) => (n === "RateLimit" ? (a.rate ?? "limit=10, remaining=9, reset=60") : null) },
      json: async () => {
        if (a.body === undefined) throw new Error("no body");
        return a.body;
      },
    };
  };
  const ctx: PaylukContext = {
    config: { key: "sk_test_abc", baseUrl: "https://staging.api.payluk.ng", environment: "staging" },
    fetch,
    gate: new PaylukRateGate(now),
  };
  return { ctx, calls };
}

describe("naira at the Payluk boundary, never kobo (the hundredfold error)", () => {
  it("sends 1000 for a 1,000 naira withdrawal, not 100000 and not 10", () => {
    const body = intentBody({
      type: "withdrawal",
      reference: "rm-plw-1",
      amountMinor: 100_000,
      bank: { bankCode: "011", bankName: "First Bank Nigeria", accountNumber: "3069839406", accountName: "EZUMAH JEREMIAH KALU" },
    });
    expect(body.amount).toBe(1000);
    expect(body.transactionType).toBe("withdrawal");
  });

  it("round-trips kobo exactly, including odd kobo", () => {
    for (const kobo of [100_00, 1_000_000_00, 1_050, 99, 0]) expect(nairaToKobo(koboToNaira(kobo))).toBe(kobo);
    expect(koboToNaira(1_000_000)).toBe(10_000); // the docs: "send 10000 for ₦10,000"
  });

  it("builds the crypto payout as a withdrawal with blockchainDetails, and refuses a bad address", () => {
    const body = intentBody({
      type: "withdrawal_crypto",
      reference: "rm-plw-c",
      amountMinor: 100_000,
      chain: { toAddress: "0x0915ea16f52b11444695d283e6c0f5936d1e0d56", network: "BSC" },
    });
    expect(body).toMatchObject({ amount: 1000, transactionType: "withdrawal", blockchainDetails: { network: "BSC" } });
    expect(() =>
      intentBody({ type: "withdrawal_crypto", reference: "r", amountMinor: 100_000, chain: { toAddress: "0x123", network: "BSC" } }),
    ).toThrow(RangeError);
  });

  it("refuses a fractional kobo amount rather than rounding money", () => {
    expect(() => koboToNaira(10.5)).toThrow(RangeError);
    expect(() => koboToNaira(-1)).toThrow(RangeError);
  });

  it("reads the documented fee of 100 on a 10,000 naira withdrawal as 10,000 kobo", async () => {
    const { ctx } = harness([
      {
        status: 200,
        body: {
          status: 200,
          message: "Payment intent created successfully",
          data: { id: "692838701c1a5da0bf1c2bad", amount: 10000, reference: "99999533334", fee: 100, transactionType: "withdrawal", status: "pending" },
        },
      },
    ]);
    const r = await createIntent(ctx, "cust-1", {
      type: "withdrawal",
      reference: "99999533334",
      amountMinor: 1_000_000,
      bank: { bankCode: "011", bankName: "First Bank Nigeria", accountNumber: "3069839406", accountName: "EZUMAH JEREMIAH KALU" },
    });
    expect(r).toMatchObject({ ok: true, value: { amountMinor: 1_000_000, feeMinor: 10_000, status: "pending" } });
  });
});

describe("requests carry the documented headers", () => {
  it("bearer key, customer-id on wallet routes, none on the bank list", async () => {
    const { ctx, calls } = harness([
      { status: 200, body: { data: { id: "w", mainBalance: 99000, escrowBalance: 1000, currency: "NG" } } },
      { status: 200, body: { data: [{ name: "Access Bank", code: "044" }] } },
    ]);
    const bal = await getBalance(ctx, "cust-1");
    expect(bal).toEqual({
      ok: true,
      value: { providerBalanceId: "w", availableMinor: 9_900_000, protectedMinor: 100_000, currency: "NGN", providerUpdatedAt: null },
    });
    await getBankList(ctx);
    expect(calls[0]!.url).toBe("https://staging.api.payluk.ng/v1/wallet");
    expect(calls[0]!.headers.Authorization).toBe("Bearer sk_test_abc");
    expect(calls[0]!.headers["customer-id"]).toBe("cust-1");
    expect(calls[1]!.headers["customer-id"]).toBeUndefined();
  });

  it("a balance that is not naira is unreadable, never a zero", async () => {
    const { ctx } = harness([{ status: 200, body: { data: { mainBalance: "lots", escrowBalance: 0 } } }]);
    expect(await getBalance(ctx, "c")).toMatchObject({ ok: false, kind: "unreadable" });
  });
});

describe("failure handling (founder section 31)", () => {
  it("no answer on a money-moving call is UNKNOWN, on a read it is unavailable", async () => {
    const a = harness(["network"]);
    expect(await verifyIntent(a.ctx, "c", { reference: "r" })).toMatchObject({ ok: false, kind: "unknown" });
    const b = harness(["network"]);
    expect(await getBalance(b.ctx, "c")).toMatchObject({ ok: false, kind: "unavailable" });
  });

  it("maps the documented codes", () => {
    expect(failureKindFor(429, true)).toBe("rate_limited");
    expect(failureKindFor(410, false)).toBe("not_configured");
    expect(failureKindFor(503, true)).toBe("unavailable");
    expect(failureKindFor(504, true)).toBe("unknown");
    expect(failureKindFor(504, false)).toBe("unavailable");
    expect(failureKindFor(400, true)).toBe("refused");
    expect(failureKindFor(404, false)).toBe("not_found");
  });

  it("an accepted call with an unreadable body is UNKNOWN, not success", async () => {
    const { ctx } = harness([{ status: 200 }]);
    expect(await verifyIntent(ctx, "c", { reference: "r" })).toMatchObject({ ok: false, kind: "unknown" });
  });

  it("a staged intent that does not match the request is UNKNOWN", async () => {
    const { ctx } = harness([{ status: 200, body: { data: { id: "i", amount: 500, reference: "other", fee: 0, status: "pending" } } }]);
    const r = await createIntent(ctx, "c", { type: "deposit", reference: "rm-pld-1", amountMinor: 50_000 });
    expect(r).toMatchObject({ ok: false, kind: "unknown" });
  });

  it("an intent without a fee is never treated as free", async () => {
    const { ctx } = harness([{ status: 200, body: { data: { id: "i", amount: 500, reference: "rm-pld-1", status: "pending" } } }]);
    expect(await createIntent(ctx, "c", { type: "deposit", reference: "rm-pld-1", amountMinor: 50_000 })).toMatchObject({ ok: false, kind: "unknown" });
  });

  it("recognises an OTP refusal", () => {
    expect(needsOtp({ ok: false, kind: "refused", httpStatus: 400, detail: "OTP is required", retryAfterSeconds: null })).toBe(true);
    expect(needsOtp({ ok: false, kind: "refused", httpStatus: 400, detail: "Insufficient balance", retryAfterSeconds: null })).toBe(false);
  });
});

describe("the rate limit: 10 a minute per key (authentication.txt)", () => {
  it("holds calls locally once the window is spent, without spending a request", async () => {
    let t = 0;
    const { ctx, calls } = harness([{ status: 200, rate: "limit=10, remaining=0, reset=41", body: { data: [] } }], () => t);
    await getBankList(ctx);
    const held = await getBankList(ctx);
    expect(held).toMatchObject({ ok: false, kind: "rate_limited", retryAfterSeconds: 41 });
    expect(calls).toHaveLength(1);
    t = 42_000;
    await getBankList(ctx);
    expect(calls).toHaveLength(2);
  });

  it("a 429 closes the gate for the reset the provider named", async () => {
    const { ctx, calls } = harness([{ status: 429, rate: "limit=10, remaining=0, reset=30", body: { status: 429, message: "Too many request" } }]);
    expect(await getBankList(ctx)).toMatchObject({ ok: false, kind: "rate_limited", retryAfterSeconds: 30 });
    expect(await getBankList(ctx)).toMatchObject({ kind: "rate_limited" });
    expect(calls).toHaveLength(1);
  });
});

describe("customers", () => {
  it("a documented no-match is null, so onboarding creates rather than fails", async () => {
    const { ctx, calls } = harness([{ status: 400, body: { status: 400, message: "No customer found with the provided email", data: {} } }]);
    expect(await findCustomerByEmail(ctx, "ada@example.com")).toEqual({ ok: true, value: null });
    expect(calls[0]!.url).toBe("https://staging.api.payluk.ng/v1/customers?email=ada%40example.com");
  });

  it("reads the documented created customer", async () => {
    const { ctx, calls } = harness([
      {
        status: 201,
        body: {
          status: 201,
          data: {
            customerId: "6a19b57ffa797d3af379ca2a",
            firstname: "Ada",
            lastname: "Eze",
            phone: "08012345678",
            status: "active",
            blockedAt: null,
            permissions: { canWithdraw: true, canBuy: true, canSell: true },
          },
        },
      },
    ]);
    const r = await createCustomer(ctx, { firstName: "Ada", lastName: "Eze", email: "ada@example.com", phone: "08012345678", country: "NG" });
    expect(r).toMatchObject({ ok: true, value: { customerId: "6a19b57ffa797d3af379ca2a", status: "active", blocked: false, canWithdraw: true } });
    expect(calls[0]!.body).toEqual({ firstname: "Ada", lastname: "Eze", email: "ada@example.com", phone: "08012345678", countryId: "NG" });
  });
});

describe("bank account resolution", () => {
  it("returns the verified name and never invents one", async () => {
    const ok = harness([{ status: 200, body: { data: { accountName: "TEST CUSTOMER NAME", accountNumber: "3069748575", bankCode: "011" } } }]);
    expect(await verifyAccount(ok.ctx, "c", { accountNumber: "3069748575", bankCode: "011" })).toMatchObject({
      ok: true,
      value: { accountName: "TEST CUSTOMER NAME" },
    });
    const blank = harness([{ status: 200, body: { data: { accountName: "" } } }]);
    expect(await verifyAccount(blank.ctx, "c", { accountNumber: "3069748575", bankCode: "011" })).toMatchObject({ ok: false });
  });
});

describe("history read-back", () => {
  it("finds the reference in the flat array a filter returns", async () => {
    const { ctx, calls } = harness([
      { status: 200, body: { data: [{ id: "t", amount: 1015, reference: "ref-1", fee: 15, transactionType: "escrow", status: "success", creditType: "debit" }] } },
    ]);
    const r = await findTransaction(ctx, "c", "ref-1");
    expect(r).toMatchObject({ ok: true, value: { amountMinor: 101_500, feeMinor: 1_500, status: "success", direction: "debit" } });
    expect(calls[0]!.url).toContain("/v1/payment/history?reference=ref-1");
  });

  it("absence is null, not a failure", async () => {
    const { ctx } = harness([{ status: 200, body: { data: [] } }]);
    expect(await findTransaction(ctx, "c", "ref-1")).toEqual({ ok: true, value: null });
  });
});

describe("hosted deposit collection (UNVERIFIED shapes)", () => {
  it("takes an https URL from checkoutConfig, else keeps the object whole", () => {
    expect(parseHosted({ checkoutConfig: { authorizationUrl: "https://checkout.example/x" } })).toEqual({ kind: "checkout_url", url: "https://checkout.example/x" });
    expect(parseHosted({ checkoutConfig: { publicKey: "pk", url: "http://insecure" } })).toMatchObject({ kind: "checkout_config" });
    expect(parseHosted({ testAccount: { bankName: "Payluk Test Bank", accountNumber: 1234567890 } })).toEqual({
      kind: "test_account",
      details: { bankName: "Payluk Test Bank", accountNumber: "1234567890" },
    });
    expect(parseHosted({})).toBeNull();
  });
});

describe("webhooks (concepts_webhooks)", () => {
  const body = JSON.stringify({
    event: "payment.withdrawal.success",
    data: {
      id: "665f1b2c9a1e4d0012ab3d44",
      reference: "PLK-WD-8842190",
      amount: 50000,
      fee: 100,
      currency: "NGN",
      status: "success",
      transactionType: "withdrawal",
      creditType: "debit",
      customerId: "665f1b2c9a1e4d0012ab3c02",
      environment: "live",
    },
    timestamp: "2026-06-22T12:00:04.000Z",
  });
  const sig = createHmac("sha512", "sk_live_k").update(body).digest("hex");

  it("verifies the hex HMAC-SHA512 of the raw body and nothing else", () => {
    expect(verifyPaylukSignature(body, sig, "sk_live_k")).toBe(true);
    expect(verifyPaylukSignature(body + " ", sig, "sk_live_k")).toBe(false);
    expect(verifyPaylukSignature(body, sig, "sk_live_other")).toBe(false);
    expect(verifyPaylukSignature(body, null, "sk_live_k")).toBe(false);
    expect(verifyPaylukSignature(body, "zz", "sk_live_k")).toBe(false);
  });

  it("keys a payment on reference and event, so a reversal is a second fact and a redelivery is not", () => {
    const w = parsePaylukWebhook(JSON.parse(body));
    expect(w).toMatchObject({
      family: "payment",
      key: "payment:PLK-WD-8842190:payment.withdrawal.success",
      outcome: "success",
      movement: { amountMinor: 5_000_000, feeMinor: 10_000, customerId: "665f1b2c9a1e4d0012ab3c02" },
    });
    const reversed = parsePaylukWebhook({ ...JSON.parse(body), event: "payment.withdrawal.reversed" });
    expect(reversed?.key).not.toBe(w?.key);
  });

  it("keys an escrow on its id and records unknown families instead of refusing them", () => {
    expect(parsePaylukWebhook({ event: "escrow.completed", data: { id: "e1", status: "COMPLETED" } })).toMatchObject({ family: "escrow", key: "escrow:e1:escrow.completed" });
    expect(parsePaylukWebhook({ event: "vault.closed", data: { id: "v1" } })).toMatchObject({ family: "other" });
    expect(parsePaylukWebhook({ event: "payment.deposit.success", data: { amount: "x" } })).toBeNull();
    expect(parsePaylukWebhook("nope")).toBeNull();
  });

  it("a test delivery never verifies against a live key's environment", () => {
    expect(environmentMatches("test", "production")).toBe(false);
    expect(environmentMatches("live", "production")).toBe(true);
    expect(environmentMatches("test", "staging")).toBe(true);
  });
});
