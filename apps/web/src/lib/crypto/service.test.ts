import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CryptoRampProvider, ProviderEvent } from "./provider";

/**
 * Orchestration with the database and the provider mocked: the settlement
 * legs, the facts handed to `crypto_payment_apply`, what is told to whom on
 * each outcome, and that a quote whose figures disagree is never shown.
 * Idempotency itself is the database's and is proven by the live probe
 * (supabase/tests/probes/crypto-pay.sql).
 */

const recordAlert = vi.fn(async (_input: unknown) => ({ ok: true }));
const announce = vi.fn(async (_admin: unknown, _a: unknown) => ({ notified: true, emailed: "skipped" }));
const announceConfirmedStay = vi.fn(async (_admin: unknown, _p: unknown) => {});
vi.mock("@/lib/alerts", () => ({ recordAlert: (i: unknown) => recordAlert(i) }));
vi.mock("@/lib/notify/junction", () => ({ announce: (a: unknown, b: unknown) => announce(a, b) }));
vi.mock("@/lib/bookings/arrival", () => ({ announceConfirmedStay: (a: unknown, b: unknown) => announceConfirmedStay(a, b) }));

const { applyEvent, factsForDb, legDestinations, requestQuote, settlementLegs, startPayment } = await import("./service");
const { findPair } = await import("./assets");

const REF = "rm-yc-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";
const ROW = {
  id: "cp1", reference: REF, booking_id: "b1", state: "settled", asset: "USDT", network: "TRON", asset_decimals: 6,
  amount_minor: 17_000_000, fee_minor: 0, rate_ngn: "1650.25", crypto_amount: "103.014695", quote_expires_at: "2026-09-29T12:00:00Z",
  payer_id: "u1",
};

/** A chainable stand-in for the service-role client. */
function fakeAdmin(rpcAnswer: unknown, tables: Record<string, unknown> = {}) {
  const inserted: unknown[] = [];
  const chain = (table: string) => {
    const self: Record<string, unknown> = {};
    for (const m of ["select", "eq", "limit", "order"]) self[m] = () => self;
    self.maybeSingle = async () => ({ data: tables[table] ?? null, error: null });
    self.single = async () => ({ data: tables[`${table}:insert`] ?? null, error: null });
    self.insert = (row: unknown) => {
      inserted.push(row);
      return self;
    };
    self.then = (resolve: (v: unknown) => void) => resolve({ data: tables[`${table}:list`] ?? [], error: null });
    return self;
  };
  return {
    rpc: vi.fn(async () => ({ data: rpcAnswer, error: null })),
    from: vi.fn((table: string) => chain(table)),
    inserted,
  };
}

const provider = {
  id: "yellowcard",
  displayName: "Yellow Card",
  quote: vi.fn(),
} as unknown as CryptoRampProvider & { quote: ReturnType<typeof vi.fn> };

const settled: ProviderEvent = {
  eventId: "evt_1",
  reference: REF,
  providerPaymentId: "yc_pay_1",
  state: "settled",
  facts: { settledMinor: 17_000_000, txHash: "abcdef0123456789", cryptoReceived: "103.014695" },
};

beforeEach(() => {
  recordAlert.mockClear();
  announce.mockClear();
  announceConfirmedStay.mockClear();
});

describe("settlementLegs", () => {
  const platform = {
    reserve: { kind: "bank" as const, bankCode: "058", accountNumber: "0987654321", accountName: "VALLO GUARANTEE RESERVE" },
    vallo: { kind: "provider_account" as const, accountId: "acct-vallo" },
  };
  const answer = {
    status: "ok", amount_minor: 17_000_000, lister_share_minor: 16_745_000, guarantee_minor: 255_000, commission_minor: 0,
    lister_bank_code: "058", lister_account_number: "0123456789", lister_account_name: "ADA OBI",
  };

  it("builds the three legs the card split pays, to the lister's bank, the reserve and Vallo", () => {
    expect(settlementLegs(answer, platform)).toEqual([
      { role: "lister", amountMinor: 16_745_000, destination: { kind: "bank", bankCode: "058", accountNumber: "0123456789", accountName: "ADA OBI" } },
      { role: "guarantee_reserve", amountMinor: 255_000, destination: platform.reserve },
      { role: "vallo_commission", amountMinor: 0, destination: platform.vallo },
    ]);
  });

  it("records the real destinations on the event, the reserve's bank account in full and the lister's by last four", () => {
    expect(legDestinations(settlementLegs(answer, platform)!)).toEqual([
      { role: "lister", amount_minor: 16_745_000, kind: "bank", bank_code: "058", account_last4: "6789" },
      { role: "guarantee_reserve", amount_minor: 255_000, kind: "bank", bank_code: "058", account_number: "0987654321", account_name: "VALLO GUARANTEE RESERVE" },
      { role: "vallo_commission", amount_minor: 0, kind: "provider_account", account_id: "acct-vallo" },
    ]);
  });

  it("refuses legs that do not add up, or a lister with no verified account", () => {
    expect(settlementLegs({ ...answer, guarantee_minor: 255_001 }, platform)).toBeNull();
    expect(settlementLegs({ ...answer, lister_account_number: undefined }, platform)).toBeNull();
    expect(settlementLegs({ ...answer, lister_share_minor: 1.5 }, platform)).toBeNull();
  });
});

describe("factsForDb", () => {
  it("hands crypto over as strings and naira as integer kobo, dropping empties", () => {
    expect(factsForDb(settled, { deposit_address: "TAddr", deposit_memo: null })).toEqual({
      deposit_address: "TAddr",
      provider_payment_id: "yc_pay_1",
      tx_hash: "abcdef0123456789",
      crypto_received: "103.014695",
      settled_minor: 17_000_000,
    });
  });
});

describe("applyEvent", () => {
  it("passes the report to the database door with its event id, and on a real settlement tells the payer and the stay", async () => {
    const admin = fakeAdmin({ outcome: "applied", state: "settled", charge: { outcome: "settled" } }, { crypto_payments: ROW });
    const result = await applyEvent(admin as never, provider, settled, "webhook");
    expect(result).toMatchObject({ ok: true, outcome: "applied", state: "settled", chargeOutcome: "settled" });
    expect(admin.rpc).toHaveBeenCalledWith("crypto_payment_apply", expect.objectContaining({
      p_reference: REF, p_provider: "yellowcard", p_event_id: "evt_1", p_source: "webhook", p_to_state: "settled",
    }));
    expect(announceConfirmedStay).toHaveBeenCalledWith(admin, { bookingId: "b1" });
    expect(announce).toHaveBeenCalledWith(admin, expect.objectContaining({
      recipient: { kind: "user", userId: "u1" },
      notice: expect.objectContaining({ title: "Paid in crypto", href: `/pay/crypto/${REF}` }),
    }));
  });

  it("does nothing further on a duplicate delivery", async () => {
    const admin = fakeAdmin({ outcome: "duplicate", state: "settled" }, { crypto_payments: ROW });
    const result = await applyEvent(admin as never, provider, settled, "webhook");
    expect(result).toMatchObject({ ok: true, outcome: "duplicate" });
    expect(announce).not.toHaveBeenCalled();
    expect(announceConfirmedStay).not.toHaveBeenCalled();
  });

  it("raises a critical alert when the settled naira is not exactly the charge", async () => {
    const admin = fakeAdmin({ outcome: "amount-mismatch", state: "converting" });
    await applyEvent(admin as never, provider, settled, "webhook");
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "crypto.settlement_amount_mismatch", severity: "critical" }));
    expect(announce).not.toHaveBeenCalled();
  });

  it("raises return_needed when the provider settled a charge that could not be applied", async () => {
    const admin = fakeAdmin({ outcome: "applied", state: "settled", charge: { outcome: "refund-due", reason: "already_paid" } }, { crypto_payments: ROW });
    await applyEvent(admin as never, provider, settled, "webhook");
    expect(recordAlert).toHaveBeenCalledWith(expect.objectContaining({ kind: "crypto.return_needed", severity: "critical" }));
    expect(announceConfirmedStay).not.toHaveBeenCalled();
  });

  it("throws when the database cannot be asked, so the webhook answers 500 and is retried", async () => {
    const admin = { rpc: vi.fn(async () => ({ data: null, error: { message: "down" } })), from: vi.fn() };
    await expect(applyEvent(admin as never, provider, settled, "webhook")).rejects.toThrow(/crypto_payment_apply/);
  });
});

describe("startPayment", () => {
  const quoted = {
    id: "cp1", reference: REF, payer_id: "u1", state: "quoted", asset: "USDT", network: "TRON", amount_minor: 17_000_000,
    provider: "yellowcard", provider_quote_id: "q1", quote_expires_at: "2099-01-01T00:00:00Z",
  };
  const ready = {
    ...provider,
    isDirectSettlementReady: () => true,
    platformDestinations: () => ({
      reserve: { kind: "bank" as const, bankCode: "058", accountNumber: "0987654321", accountName: "VALLO GUARANTEE RESERVE" },
      vallo: { kind: "provider_account" as const, accountId: "acct-vallo" },
    }),
    createPayment: vi.fn(),
  } as unknown as CryptoRampProvider & { createPayment: ReturnType<typeof vi.fn> };

  it("refuses in a sentence, and asks the provider for nothing, while another payment of the charge is in flight", async () => {
    const admin = fakeAdmin({ status: "in_flight" }, { crypto_payments: quoted });
    const r = await startPayment({
      admin: admin as never, provider: ready, paymentId: "cp1", payerId: "u1",
      refundAddress: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", reserveCode: "ACCT_reserve", payer: { email: null, legalName: null },
    });
    expect(r).toEqual({ ok: false, message: expect.stringMatching(/already under way/) });
    expect(ready.createPayment).not.toHaveBeenCalled();
  });

  it("refuses a refund address that is not on the payment's network", async () => {
    const admin = fakeAdmin({ status: "ok" }, { crypto_payments: quoted });
    const r = await startPayment({
      admin: admin as never, provider: ready, paymentId: "cp1", payerId: "u1",
      refundAddress: "0x0000000000000000000000000000000000000000", reserveCode: "ACCT_reserve", payer: { email: null, legalName: null },
    });
    expect(r.ok).toBe(false);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});

describe("requestQuote", () => {
  const booking = { id: "b1", guest_id: "u1", status: "CONFIRMED", total_minor: 17_000_000, currency: "NGN" };
  const enabled = [findPair("USDT", "TRON")!];

  it("refuses a pair that is not enabled, before calling anybody", async () => {
    const admin = fakeAdmin(null, { bookings: booking });
    const r = await requestQuote({ admin: admin as never, provider, enabled, bookingId: "b1", payerId: "u1", asset: "BTC", network: "BITCOIN" });
    expect(r.ok).toBe(false);
    expect(provider.quote).not.toHaveBeenCalled();
  });

  it("refuses somebody else's booking", async () => {
    const admin = fakeAdmin(null, { bookings: booking });
    const r = await requestQuote({ admin: admin as never, provider, enabled, bookingId: "b1", payerId: "someone-else", asset: "USDT", network: "TRON" });
    expect(r).toEqual({ ok: false, message: expect.stringMatching(/could not find/) });
  });

  it("never shows a quote whose crypto amount disagrees with its own rate", async () => {
    provider.quote.mockResolvedValueOnce({ quoteId: "q1", rate: "1650.25", cryptoAmount: "1.030147", feeMinor: 0, expiresAt: "2099-01-01T00:00:00Z" });
    const admin = fakeAdmin(null, { bookings: booking });
    const r = await requestQuote({ admin: admin as never, provider, enabled, bookingId: "b1", payerId: "u1", asset: "USDT", network: "TRON" });
    expect(r.ok).toBe(false);
    expect(admin.inserted).toEqual([]);
  });

  it("writes a quoted row for the stored total when the figures agree", async () => {
    provider.quote.mockResolvedValueOnce({ quoteId: "q1", rate: "1650.25", cryptoAmount: "103.014695", feeMinor: 0, expiresAt: "2099-01-01T00:00:00Z" });
    const admin = fakeAdmin(null, { bookings: booking, "crypto_payments:insert": { ...ROW, state: "quoted" } });
    const r = await requestQuote({ admin: admin as never, provider, enabled, bookingId: "b1", payerId: "u1", asset: "USDT", network: "TRON" });
    expect(r.ok).toBe(true);
    expect(admin.inserted[0]).toMatchObject({ booking_id: "b1", payer_id: "u1", amount_minor: 17_000_000, crypto_amount: "103.014695", asset_decimals: 6, state: "quoted" });
  });
});
