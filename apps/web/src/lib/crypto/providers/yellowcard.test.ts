import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { YellowCardProvider, koboToNairaString, mapStatus, nairaToKobo } from "./yellowcard";
import type { SettlementLeg } from "../provider";

/**
 * The Yellow Card adapter with `fetch` mocked. No real call is ever made:
 * no keys exist, and the request shapes are unconfirmed until onboarding.
 */

const REF = "rm-yc-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";

function configure() {
  vi.stubEnv("YELLOWCARD_API_KEY", "yc_key");
  vi.stubEnv("YELLOWCARD_API_SECRET", "yc_secret");
  vi.stubEnv("YELLOWCARD_API_BASE", "https://sandbox.yellowcard.example");
  vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "yc_webhook");
}

beforeEach(configure);
afterEach(() => vi.unstubAllEnvs());

describe("naira at the edge, exactly", () => {
  it("writes kobo as a naira string with no float", () => {
    expect(koboToNairaString(1_234_567)).toBe("12345.67");
    expect(koboToNairaString(5)).toBe("0.05");
    expect(koboToNairaString(17_000_000)).toBe("170000.00");
  });

  it("reads a naira figure as kobo, refusing a third decimal", () => {
    expect(nairaToKobo("12345.67")).toBe(1_234_567);
    expect(nairaToKobo(170000)).toBe(17_000_000);
    expect(nairaToKobo("12345.678")).toBeNull();
    expect(nairaToKobo("-1")).toBeNull();
  });
});

describe("configuration", () => {
  it("needs the key, the secret, an https host and the webhook secret", () => {
    const p = new YellowCardProvider();
    expect(p.isConfigured()).toBe(true);
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "");
    expect(p.isConfigured()).toBe(false);
    configure();
    vi.stubEnv("YELLOWCARD_API_BASE", "http://insecure.example");
    expect(p.isConfigured()).toBe(false);
  });

  it("is ready to settle directly only with both confirmations, Vallo's account and the reserve's BANK account", () => {
    const p = new YellowCardProvider();
    vi.stubEnv("YELLOWCARD_DIRECT_SETTLEMENT", "confirmed");
    expect(p.isDirectSettlementReady()).toBe(false);
    vi.stubEnv("YELLOWCARD_VALLO_SETTLEMENT_ACCOUNT_ID", "acct-vallo");
    vi.stubEnv("YELLOWCARD_RESERVE_BANK_CODE", "058");
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NUMBER", "0987654321");
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NAME", "VALLO GUARANTEE RESERVE");
    // Vallo's provider account must be confirmed to pay out to Vallo's bank.
    expect(p.isDirectSettlementReady()).toBe(false);
    vi.stubEnv("YELLOWCARD_PROVIDER_ACCOUNTS_ARE_BANK_PAYOUTS", "confirmed");
    expect(p.isDirectSettlementReady()).toBe(true);
    vi.stubEnv("YELLOWCARD_DIRECT_SETTLEMENT", "true");
    expect(p.isDirectSettlementReady()).toBe(false);
  });

  it("sends the reserve leg to a bank account, never a provider balance, and refuses a malformed one", () => {
    const p = new YellowCardProvider();
    vi.stubEnv("YELLOWCARD_VALLO_SETTLEMENT_ACCOUNT_ID", "acct-vallo");
    vi.stubEnv("YELLOWCARD_RESERVE_BANK_CODE", "058");
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NUMBER", "0987654321");
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NAME", "VALLO GUARANTEE RESERVE");
    expect(p.platformDestinations()?.reserve).toEqual({
      kind: "bank",
      bankCode: "058",
      accountNumber: "0987654321",
      accountName: "VALLO GUARANTEE RESERVE",
    });
    vi.stubEnv("YELLOWCARD_RESERVE_ACCOUNT_NUMBER", "12345");
    expect(p.platformDestinations()).toBeNull();
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ sequenceId: REF, status: "COMPLETE" });
  const sign = (raw: string, key = "yc_webhook") => createHmac("sha256", key).update(raw, "utf8").digest("base64");
  const headers = (sig: string) => new Headers({ "x-yc-signature": sig });

  it("accepts the provider's signature and refuses a changed body, another key, or none", () => {
    const p = new YellowCardProvider();
    expect(p.verifyWebhook(body, headers(sign(body)))).toBe(true);
    expect(p.verifyWebhook(`${body} `, headers(sign(body)))).toBe(false);
    expect(p.verifyWebhook(body, headers(sign(body, "yc_secret")))).toBe(false);
    expect(p.verifyWebhook(body, new Headers())).toBe(false);
  });

  it("refuses everything when the webhook secret is unset", () => {
    vi.stubEnv("YELLOWCARD_WEBHOOK_SECRET", "");
    expect(new YellowCardProvider().verifyWebhook(body, headers(sign(body, "")))).toBe(false);
  });
});

describe("parseWebhook", () => {
  const p = new YellowCardProvider();

  it("maps provider words onto our states, and unknown words onto nothing", () => {
    expect(mapStatus("complete")).toBe("settled");
    expect(mapStatus("PARTIALLY-PAID")).toBe("underpaid");
    expect(mapStatus("Overpaid")).toBe("overpaid");
    expect(mapStatus("processing")).toBe("converting");
    expect(mapStatus("mystery")).toBeNull();
  });

  it("reads a settled report: naira kobo exactly, crypto at the asset's precision", () => {
    const event = p.parseWebhook({
      eventId: "evt_1",
      data: {
        id: "yc_pay_1",
        sequenceId: REF,
        status: "COMPLETED",
        asset: "USDT",
        network: "TRON",
        amountReceived: "103.014695",
        txHash: "abcdef0123456789",
        settledAmount: "170000.00",
      },
    });
    expect(event).toEqual({
      eventId: "evt_1",
      reference: REF,
      providerPaymentId: "yc_pay_1",
      state: "settled",
      facts: { cryptoReceived: "103.014695", txHash: "abcdef0123456789", settledMinor: 17_000_000 },
    });
  });

  it("counts ONLY an explicit settledAmount: the quoted localAmount never settles a charge", () => {
    const event = p.parseWebhook({ sequenceId: REF, status: "COMPLETED", asset: "USDT", network: "TRON", localAmount: "170000.00" });
    expect(event?.state).toBe("settled");
    // No settled_minor reaches the database, which refuses it as amount-mismatch (probe crypto-pay).
    expect(event?.facts.settledMinor).toBeUndefined();
  });

  it("drops crypto figures for an unknown asset or network, so the report can still be recorded", () => {
    const event = p.parseWebhook({ sequenceId: REF, status: "CONFIRMING", asset: "DOGE", network: "DOGECOIN", amountReceived: "12.3456789012", confirmations: 2 });
    expect(event?.facts).toEqual({ confirmations: 2 });
  });

  it("drops a crypto figure with more decimals than the asset has, rather than rounding it", () => {
    const event = p.parseWebhook({ sequenceId: REF, status: "UNDERPAID", asset: "USDT", network: "TRON", amountReceived: "1.0000001" });
    expect(event?.facts.cryptoReceived).toBeUndefined();
  });

  it("gives the same report the same derived id, so a redelivery is one event", () => {
    const body = { sequenceId: REF, status: "CONFIRMING", confirmations: 3, txHash: "abcdef0123456789" };
    const a = p.parseWebhook(body);
    const b = p.parseWebhook({ ...body });
    expect(a?.eventId).toBe(b?.eventId);
    expect(p.parseWebhook({ ...body, confirmations: 4 })?.eventId).not.toBe(a?.eventId);
  });

  it("tells apart two reports that differ only in the amount received or the return hash", () => {
    const base = { sequenceId: REF, status: "UNDERPAID", asset: "USDT", network: "TRON", txHash: "abcdef0123456789" };
    const first = p.parseWebhook({ ...base, amountReceived: "50" })?.eventId;
    expect(p.parseWebhook({ ...base, amountReceived: "80" })?.eventId).not.toBe(first);
    const refunded = { sequenceId: REF, status: "REFUNDED" };
    expect(p.parseWebhook({ ...refunded, refundTxHash: "aaaaaaaaaa11" })?.eventId).not.toBe(
      p.parseWebhook({ ...refunded, refundTxHash: "bbbbbbbbbb22" })?.eventId,
    );
  });

  it("refuses a body with no reference or an unknown status", () => {
    expect(p.parseWebhook({ status: "COMPLETED" })).toBeNull();
    expect(p.parseWebhook({ sequenceId: REF, status: "WHATEVER" })).toBeNull();
    expect(p.parseWebhook(null)).toBeNull();
  });
});

describe("requests (fetch mocked)", () => {
  const legs: SettlementLeg[] = [
    { role: "lister", amountMinor: 16_745_000, destination: { kind: "bank", bankCode: "058", accountNumber: "0123456789", accountName: "ADA OBI" } },
    { role: "guarantee_reserve", amountMinor: 255_000, destination: { kind: "bank", bankCode: "058", accountNumber: "0987654321", accountName: "VALLO GUARANTEE RESERVE" } },
    { role: "vallo_commission", amountMinor: 0, destination: { kind: "provider_account", accountId: "acct-vallo" } },
  ];
  const input = {
    reference: REF,
    quoteId: "q1",
    asset: "USDT",
    network: "TRON",
    amountMinor: 17_000_000,
    refundAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    payer: { email: "ada@example.com", legalName: "Ada Obi" },
    settlement: legs,
  };

  it("never calls the provider with legs that do not add up to the charge", async () => {
    const fetcher = vi.fn();
    const p = new YellowCardProvider(fetcher as never);
    await expect(p.createPayment({ ...input, amountMinor: 17_000_001 })).rejects.toThrow(/does not add up/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends each naira leg to its own destination and reads the provider's address back", async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify({ id: "yc_pay_1", walletAddress: "TProviderAddress000000000000000000", expiresAt: "2026-09-29T12:30:00Z", requiredConfirmations: 19 }), { status: 200 }),
    );
    const p = new YellowCardProvider(fetcher as never);
    const payment = await p.createPayment(input);
    expect(payment).toMatchObject({ providerPaymentId: "yc_pay_1", depositAddress: "TProviderAddress000000000000000000", confirmationsRequired: 19 });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://sandbox.yellowcard.example/business/crypto-collections");
    const sent = JSON.parse(String(init.body)) as { localAmount: string; settlement: Record<string, unknown>[] };
    expect(sent.localAmount).toBe("170000.00");
    // The zero commission leg is not sent; the lister and the reserve are, each to its own account.
    expect(sent.settlement).toEqual([
      expect.objectContaining({ narration: "lister", amount: "167450.00", bankCode: "058", accountNumber: "0123456789" }),
      expect.objectContaining({ narration: "guarantee_reserve", amount: "2550.00", bankCode: "058", accountNumber: "0987654321" }),
    ]);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^YcHmacV1 yc_key:/);
  });

  it("refuses a quote it cannot read", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: "q1", rate: "abc" }), { status: 200 }));
    await expect(new YellowCardProvider(fetcher as never).quote({ reference: REF, amountMinor: 1_000, asset: "USDT", network: "TRON" })).rejects.toThrow();
  });

  it("refuses to call anything while unconfigured", async () => {
    vi.stubEnv("YELLOWCARD_API_KEY", "");
    const fetcher = vi.fn();
    await expect(new YellowCardProvider(fetcher as never).quote({ reference: REF, amountMinor: 1_000, asset: "USDT", network: "TRON" })).rejects.toThrow(/not configured/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
