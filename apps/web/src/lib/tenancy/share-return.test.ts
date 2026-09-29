import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The flatmate's return from Paystack (settleShareReturn), and the rule the
 * success sheet depends on: a share is settled, and celebrated, only against
 * the move-in on the screen it came back to (docs/SUCCESS_MOMENTS.md).
 */
const REF = "rm-book-22222222-2222-4222-8222-222222222222";
const TENANCY = "11111111-1111-4111-8111-111111111111";

const s = vi.hoisted(() => ({
  txBooking: "bk-1" as string | null,
  tenancyBooking: "bk-1" as string | null,
  settle: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: "payer-1" } }),
}));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: vi.fn(),
  isPaystackConfigured: () => true,
  verifyTransaction: async () => ({ status: "success", amountMinor: 25_000_000, feesMinor: 0, currency: "NGN" }),
}));
vi.mock("../payments/paystack-mode", () => ({ currentPaystackMode: () => "test", currentReserveSubaccount: () => "ACCT" }));
vi.mock("../bookings/settlement", () => ({ markChargeFailed: vi.fn(), settleBookingCharge: s.settle }));
vi.mock("../payments/refund", () => ({ refundChargeToCard: vi.fn() }));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../security/idempotency", () => ({ IN_FLIGHT_MESSAGE: "x", withIdempotency: vi.fn() }));
vi.mock("../payments/attempts", () => ({ recordCheckoutHandle: vi.fn(), reuseLiveAttempt: vi.fn() }));
vi.mock("../money/audit", () => ({ recordMoneyAudit: vi.fn(async () => undefined) }));
vi.mock("../bookings/arrival", () => ({ announceConfirmedStay: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = async () => ({
        data:
          table === "transactions"
            ? { share_payer_id: "payer-1", booking_id: s.txBooking }
            : table === "rent_payments"
              ? { booking_id: s.tenancyBooking }
              : null,
        error: null,
      });
      return chain;
    },
  }),
}));

import { settleShareReturn } from "./share-checkout";

beforeEach(() => {
  s.txBooking = "bk-1";
  s.tenancyBooking = "bk-1";
  s.settle.mockReset();
  s.settle.mockResolvedValue({
    outcome: "share-settled",
    bookingId: "bk-1",
    amountMinor: 25_000_000,
    paidMinor: 25_000_000,
    totalMinor: 100_000_000,
    ledger: {},
  });
});

describe("settleShareReturn", () => {
  it("settles a share of the move-in on this screen, and says what this charge was", async () => {
    const result = await settleShareReturn({ reference: REF, tenancyId: TENANCY });
    expect(result).toEqual({
      ok: true,
      data: { state: "share-settled", paidMinor: 25_000_000, totalMinor: 100_000_000, amountMinor: 25_000_000 },
    });
  });

  it("refuses, and settles nothing, when the payment is for a different move-in", async () => {
    s.txBooking = "bk-OTHER";
    const result = await settleShareReturn({ reference: REF, tenancyId: TENANCY });
    expect(result.ok).toBe(false);
    expect(s.settle).not.toHaveBeenCalled();
  });

  it("refuses when either side of the match cannot be read", async () => {
    s.tenancyBooking = null;
    expect((await settleShareReturn({ reference: REF, tenancyId: TENANCY })).ok).toBe(false);
    expect(s.settle).not.toHaveBeenCalled();
  });
});
