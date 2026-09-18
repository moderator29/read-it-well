import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One guard per booking across the three ways of paying it.
 *
 * The lead's B0 audit of 73e284e: each payment path opened its own
 * idempotency scope under the payer with a per-attempt client key, so two
 * concurrent attempts on one booking both passed the payable guard and both
 * charged. These prove the fix at the seam: every path claims the SAME scope
 * with the BOOKING as subject, an in-flight claim is refused with the
 * in-flight sentence and no charge, and only an ok answer is recorded so a
 * failed attempt stays retryable.
 */
const seam = vi.hoisted(() => ({
  withIdempotency: vi.fn(),
  rpc: vi.fn(),
  featureOn: true,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/idempotency", () => ({
  IN_FLIGHT_MESSAGE: "in flight",
  withIdempotency: seam.withIdempotency,
}));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => seam.featureOn }));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: vi.fn(),
  isPaystackConfigured: () => false,
  verifyTransaction: vi.fn(),
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: vi.fn() }));
vi.mock("../email/recipients", () => ({ contactFromSession: () => null }));
vi.mock("./arrival", () => ({ announceConfirmedStay: vi.fn() }));
vi.mock("../wallet/ledger", () => ({
  availableBalanceMinor: async () => 0,
  ensureWalletId: async () => "wallet-1",
  getAdminClient: () => ({ from: vi.fn(), rpc: seam.rpc }),
}));

const BOOKING = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";

function table(rows: Record<string, unknown>) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit", "in"]) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: rows.booking ?? null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: rows.settled ?? [], error: null });
  return chain;
}

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "guest-1", email: "g@example.invalid", user_metadata: {} },
    supabase: {
      from: (name: string) =>
        table({
          booking:
            name === "bookings"
              ? {
                  id: BOOKING,
                  listing_id: "l1",
                  guest_id: "guest-1",
                  status: "PENDING",
                  check_in: "2026-10-01",
                  check_out: "2026-10-02",
                  nights: 1,
                  total_minor: 1_000_000,
                  currency: "NGN",
                }
              : null,
          settled: [],
        }),
    },
  }),
}));

beforeEach(() => {
  seam.withIdempotency.mockReset();
  seam.featureOn = true;
});

describe("the payment paths share one per-booking guard", () => {
  it("claims the booking scope and subject on every path, and refuses in flight", async () => {
    seam.withIdempotency.mockResolvedValue({ status: "in-flight" });
    const { payWithWallet, payWithSavedCard, startCardCheckout } = await import("./checkout");
    const { bookingPaymentSubject } = await import("./payment-subject");

    const results = await Promise.all([
      payWithWallet({ bookingId: BOOKING, idempotencyKey: "k1" }),
      payWithSavedCard({ bookingId: BOOKING, methodId: BOOKING, idempotencyKey: "k2" }),
      startCardCheckout({ bookingId: BOOKING, idempotencyKey: "k3" }),
    ]);

    for (const result of results) {
      expect(result).toEqual({ ok: false, error: "in flight" });
    }
    expect(seam.withIdempotency).toHaveBeenCalledTimes(3);
    const scopes = new Set(seam.withIdempotency.mock.calls.map(([req]) => req.scope));
    const subjects = new Set(seam.withIdempotency.mock.calls.map(([req]) => req.subject));
    expect(scopes.size).toBe(1);
    expect(subjects).toEqual(new Set([bookingPaymentSubject(BOOKING)]));
    expect(bookingPaymentSubject(BOOKING)).toBe(`booking:${BOOKING}`);
  });

  it("records only an ok answer, so a refused attempt stays retryable", async () => {
    seam.withIdempotency.mockResolvedValue({ status: "in-flight" });
    const { payWithWallet } = await import("./checkout");
    await payWithWallet({ bookingId: BOOKING, idempotencyKey: "k1" });
    const request = seam.withIdempotency.mock.calls[0]?.[0];
    expect(request).toBeDefined();
    expect(request?.shouldRecord({ ok: true, data: null })).toBe(true);
    expect(request?.shouldRecord({ ok: false, error: "no" })).toBe(false);
  });

  it("does not claim the guard for a booking the caller cannot pay", async () => {
    seam.featureOn = false;
    const { payWithWallet } = await import("./checkout");
    const result = await payWithWallet({ bookingId: BOOKING, idempotencyKey: "k1" });
    expect(result.ok).toBe(false);
    expect(seam.withIdempotency).not.toHaveBeenCalled();
  });
});
