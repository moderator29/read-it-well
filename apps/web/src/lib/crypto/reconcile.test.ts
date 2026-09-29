import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CryptoRampProvider, ProviderEvent } from "./provider";

/** The reconcile job with the database, the provider and the apply door mocked. */

const applyEvent = vi.fn(async (_admin: unknown, _provider: unknown, _event: ProviderEvent, _source: string, _opts?: unknown) => ({
  ok: true,
  outcome: "applied" as string,
  state: null,
  chargeOutcome: null,
}));
vi.mock("./service", () => ({
  applyEvent: (a: unknown, b: unknown, c: ProviderEvent, d: string, e?: unknown) => applyEvent(a, b, c, d, e),
}));

const { reconcileCryptoPayments, reconcileVerdict } = await import("./reconcile");

const REF = "rm-yc-3f2a9c1e-7b4d-4e5f-9a8b-1c2d3e4f5a6b";
const NOW = Date.parse("2026-09-29T12:00:00Z");

const admin = (rows: unknown[]) => ({ rpc: vi.fn(async () => ({ data: rows, error: null })) });

const provider = (report: ProviderEvent | null | Error): CryptoRampProvider =>
  ({
    id: "yellowcard",
    displayName: "Yellow Card",
    isConfigured: () => true,
    getPayment: vi.fn(async () => {
      if (report instanceof Error) throw report;
      return report;
    }),
  }) as unknown as CryptoRampProvider;

beforeEach(() => applyEvent.mockClear());

describe("reconcileCryptoPayments", () => {
  it("expires an unaccepted quote past its time without asking the provider", async () => {
    const p = provider(null);
    const counts = await reconcileCryptoPayments(
      admin([{ reference: REF, provider: "yellowcard", provider_payment_id: null, state: "quoted", quote_expires_at: "2026-09-29T11:00:00Z" }]) as never,
      p,
      NOW,
    );
    expect(counts).toMatchObject({ checked: 1, expiredQuotes: 1 });
    expect(applyEvent.mock.calls[0]![2]).toMatchObject({ state: "expired", eventId: `reconcile:quote-expired:${REF}` });
    expect(p.getPayment).not.toHaveBeenCalled();
  });

  it("leaves a live quote alone", async () => {
    const counts = await reconcileCryptoPayments(
      admin([{ reference: REF, provider: "yellowcard", provider_payment_id: null, state: "quoted", quote_expires_at: "2026-09-29T13:00:00Z" }]) as never,
      provider(null),
      NOW,
    );
    expect(counts).toMatchObject({ unchanged: 1 });
    expect(applyEvent).not.toHaveBeenCalled();
  });

  it("reads a moving payment back and applies it under a deterministic event id", async () => {
    const report: ProviderEvent = { eventId: "x", reference: REF, providerPaymentId: "yc_1", state: "settled", facts: { settledMinor: 17_000_000, txHash: "abc0123456" } };
    const row = { reference: REF, provider: "yellowcard", provider_payment_id: "yc_1", state: "converting", quote_expires_at: "2026-09-29T11:00:00Z" };
    await reconcileCryptoPayments(admin([row]) as never, provider(report), NOW);
    await reconcileCryptoPayments(admin([row]) as never, provider(report), NOW);
    const ids = applyEvent.mock.calls.map((c) => c[2].eventId);
    // source:reference:state:confirmations:txHash:cryptoReceived:settledMinor:refundTxHash
    expect(ids[0]).toBe(`reconcile:${REF}:settled::abc0123456::17000000:`);
    expect(ids[1]).toBe(ids[0]); // the same observation twice is one event to the database
    expect(applyEvent.mock.calls[0]![3]).toBe("reconcile");
  });

  it("counts a provider failure and carries on, and the verdict asks for attention", async () => {
    const rows = [
      { reference: REF, provider: "yellowcard", provider_payment_id: "yc_1", state: "confirming", quote_expires_at: "2026-09-29T11:00:00Z" },
    ];
    const counts = await reconcileCryptoPayments(admin(rows) as never, provider(new Error("timeout")), NOW);
    expect(counts.failures).toBe(1);
    expect(reconcileVerdict(counts).outcome).toBe("attention");
  });

  it("does nothing to a moving payment when no provider is configured", async () => {
    const rows = [{ reference: REF, provider: "yellowcard", provider_payment_id: "yc_1", state: "confirming", quote_expires_at: "2026-09-29T11:00:00Z" }];
    const counts = await reconcileCryptoPayments(admin(rows) as never, null, NOW);
    expect(counts).toMatchObject({ unchanged: 1, failures: 0 });
    expect(applyEvent).not.toHaveBeenCalled();
  });
});
