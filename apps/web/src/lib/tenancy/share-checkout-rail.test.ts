import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A flatmate share opens on the rail the policy resolves, through the same
 * router and gate the main checkout uses, and writes it on the attempt row.
 */
vi.mock("server-only", () => ({}));

const s = vi.hoisted(() => ({
  answer: { state: "resolved", rail: "direct", milestones: false, policyId: "pol-apartment" } as Record<string, unknown>,
  reserve: "ACCT_reserve" as string | null,
  guarantee: 0,
  inserted: [] as Record<string, unknown>[],
  init: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: "payer-1", email: "p@example.com" } }),
}));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: s.init,
  isPaystackConfigured: () => true,
  verifyTransaction: vi.fn(),
}));
vi.mock("../payments/paystack-mode", () => ({ currentPaystackMode: () => "test", currentReserveSubaccount: () => s.reserve }));
vi.mock("../payments/router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../payments/router")>();
  return { ...actual, railForBooking: async () => s.answer };
});
vi.mock("../payments/providers", () => ({ escrowRailLive: async () => false }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("../bookings/settlement", () => ({ markChargeFailed: vi.fn(), settleBookingCharge: vi.fn() }));
vi.mock("../payments/refund", () => ({ refundChargeToCard: vi.fn() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../security/idempotency", () => ({
  IN_FLIGHT_MESSAGE: "x",
  withIdempotency: async (_o: unknown, fn: () => Promise<unknown>) => ({ status: "done", result: await fn() }),
}));
vi.mock("../payments/attempts", () => ({ recordCheckoutHandle: vi.fn(), reuseLiveAttempt: async () => ({ kind: "none" }) }));
vi.mock("../money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("../bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => ({
    rpc: async () => ({
      data: {
        status: "ok", agreement_id: "ag1", booking_id: "bk1", amount_minor: 10_000, payee_user_id: "u1",
        payee_subaccount_code: "ACCT_lister", lister_share_minor: 9_800 - s.guarantee, guarantee_minor: s.guarantee, commission_minor: 200,
      },
      error: null,
    }),
    from: () => ({ insert: async (row: Record<string, unknown>) => { s.inserted.push(row); return { error: null }; } }),
  }),
}));

import { startShareCheckout } from "./share-checkout";
import { RAIL_REFUSAL } from "../payments/router";

const TENANCY = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  s.answer = { state: "resolved", rail: "direct", milestones: false, policyId: "pol-apartment" };
  s.reserve = "ACCT_reserve";
  s.guarantee = 0;
  s.inserted = [];
  s.init.mockReset();
  s.init.mockResolvedValue({ accessCode: "ac", authorizationUrl: "https://pay" });
});

describe("startShareCheckout resolves the rail like the main checkout", () => {
  it("refuses a share whose booking resolves to escrow, writing nothing", async () => {
    s.answer = { state: "resolved", rail: "escrow", milestones: true, policyId: "pol-home" };
    const result = await startShareCheckout({ tenancyId: TENANCY });
    expect(result).toMatchObject({ ok: false, error: RAIL_REFUSAL.escrow_not_live });
    expect(s.inserted).toHaveLength(0);
    expect(s.init).not.toHaveBeenCalled();
  });

  it("refuses an unresolved rail", async () => {
    s.answer = { state: "unresolved" };
    expect((await startShareCheckout({ tenancyId: TENANCY })).ok).toBe(false);
    expect(s.inserted).toHaveLength(0);
  });

  it("opens a direct share with the rail and policy written on the attempt", async () => {
    s.guarantee = 150;
    const result = await startShareCheckout({ tenancyId: TENANCY });
    expect(result.ok).toBe(true);
    expect(s.inserted[0]).toMatchObject({ rail: "direct", rail_policy_id: "pol-apartment", reserve_subaccount_code: "ACCT_reserve" });
  });

  it("guarantee 0 with no reserve configured opens, with no reserve leg (D51)", async () => {
    s.reserve = null;
    const result = await startShareCheckout({ tenancyId: TENANCY });
    expect(result.ok).toBe(true);
    expect(s.inserted[0]).toMatchObject({ reserve_subaccount_code: null, guarantee_minor: 0, rail: "direct" });
    expect(s.init.mock.calls[0]![0].split).toMatchObject({ reserveSubaccount: null, guaranteeMinor: 0 });
  });

  it("a guarantee above 0 with no reserve configured refuses", async () => {
    s.reserve = null;
    s.guarantee = 150;
    const result = await startShareCheckout({ tenancyId: TENANCY });
    expect(result.ok).toBe(false);
    expect(s.inserted).toHaveLength(0);
  });
});
