import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkoutReturnPath, paymentReturnPath, rentInspectionForBooking } from "./return-path";

/**
 * Where a card payment comes back to.
 *
 * A stay returns to /checkout/<bookingId>; a rent charge, which rides the
 * same bookings row, returns to /rent/pay/<inspectionId>, because the tenant
 * has never seen a checkout page and would not recognise one. The database
 * decides which: a rent_payments row on the booking is the only fact that
 * tells the two apart. The last two specs prove the wiring inside
 * lib/bookings/checkout.ts itself: both card paths hand the processor the
 * rent path for a rent booking and the stay path for a stay.
 */

const BOOKING = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";
const INSPECTION = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const REFERENCE = "rm-book-2f0d3b8c-6a1e-4c9b-9d3e-1b2c3d4e5f60";

/** A service-role client that knows one rent_payments row, or none, or fails. */
function admin(row: { inspection_id: string } | null, error: { message: string } | null = null) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "limit"]) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: row, error });
  return { from: () => chain } as unknown as Parameters<typeof rentInspectionForBooking>[0];
}

describe("paymentReturnPath", () => {
  it("sends a rent charge back to its inspection's payment page", () => {
    expect(paymentReturnPath({ bookingId: BOOKING, inspectionId: INSPECTION, reference: REFERENCE })).toBe(
      `/rent/pay/${INSPECTION}?paid=1&reference=${REFERENCE}`,
    );
  });

  it("sends a stay back to its checkout", () => {
    expect(paymentReturnPath({ bookingId: BOOKING, inspectionId: null, reference: REFERENCE })).toBe(
      `/checkout/${BOOKING}?paid=1&reference=${REFERENCE}`,
    );
  });
});

describe("rentInspectionForBooking", () => {
  it("answers the inspection when the booking carries a rent charge", async () => {
    expect(await rentInspectionForBooking(admin({ inspection_id: INSPECTION }), BOOKING)).toBe(INSPECTION);
  });

  it("answers null for a stay, and null rather than throwing on a failed read", async () => {
    expect(await rentInspectionForBooking(admin(null), BOOKING)).toBeNull();
    expect(await rentInspectionForBooking(admin(null, { message: "down" }), BOOKING)).toBeNull();
    const broken = { from: () => { throw new Error("no"); } } as unknown as Parameters<typeof rentInspectionForBooking>[0];
    expect(await rentInspectionForBooking(broken, BOOKING)).toBeNull();
  });

  it("composes the two into the return path a checkout hands the processor", async () => {
    expect(await checkoutReturnPath(admin({ inspection_id: INSPECTION }), BOOKING, REFERENCE)).toBe(
      `/rent/pay/${INSPECTION}?paid=1&reference=${REFERENCE}`,
    );
    expect(await checkoutReturnPath(admin(null), BOOKING, REFERENCE)).toBe(
      `/checkout/${BOOKING}?paid=1&reference=${REFERENCE}`,
    );
  });
});

/* ------------------------------------------- the wiring in checkout.ts */

const seam = vi.hoisted(() => ({
  initializeTransaction: vi.fn(),
  chargeSavedCard: vi.fn(),
  /** The rent_payments row the fake service-role client answers with. */
  rentRow: null as { inspection_id: string } | null,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Map() }));
vi.mock("../security/idempotency", () => ({
  IN_FLIGHT_MESSAGE: "in flight",
  // The guard lets the work run, so the callback the work builds is observable.
  withIdempotency: async (_req: unknown, work: () => Promise<unknown>) => ({
    status: "done",
    result: await work(),
  }),
}));
vi.mock("../security/money-limits", () => ({ guardMoney: async () => ({ allowed: true }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../payments/paystack", () => ({
  PaystackError: class extends Error {},
  initializeTransaction: seam.initializeTransaction,
  isPaystackConfigured: () => true,
  verifyTransaction: vi.fn(),
  guaranteeReserveSubaccount: () => "ACCT_reserve",
}));
vi.mock("../payments/charge-saved-card", () => ({ chargeSavedCard: seam.chargeSavedCard }));
/* The refund a refund-due settlement sends is its own module's business. */
vi.mock("../payments/refund", () => ({ refundChargeToCard: vi.fn(async () => undefined) }));
vi.mock("../email/recipients", () => ({ contactFromSession: () => null }));
vi.mock("../bookings/arrival", () => ({ announceConfirmedStay: vi.fn() }));
vi.mock("../bookings/settlement", () => ({
  bookingForReference: vi.fn(),
  markChargeFailed: vi.fn(async () => {}),
  settleBookingCharge: vi.fn(),
}));
/* Track A: every card attempt opens with the processor split, read from the
   database. The split itself is proved in split-attempt's own tests; here it
   answers a fixed attempt so the return path is what is under test. */
vi.mock("../payments/split-attempt", () => {
  const split = { listerSubaccount: "ACCT_lister", reserveSubaccount: "ACCT_reserve", listerShareMinor: 147_750_000, guaranteeMinor: 2_250_000 };
  const opened = { reference: REFERENCE, amountMinor: 150_000_000, agreementId: "agreement-1", split };
  return {
    openSplitAttempt: async () => opened,
    /* The hosted path quotes first, then inserts (so a retry can reuse). */
    quoteSplit: async () => ({ amountMinor: 150_000_000, agreementId: "agreement-1", payeeUserId: null, commissionMinor: 0, mode: "live", split }),
    insertSplitAttempt: async () => opened,
    isRefusal: (v: { refused?: boolean }) => v.refused === true,
  };
});
/* The attempt lifecycle (reuse, the in-flight check, the open lease) has its
   own tests in lib/payments; here nothing is live, so a new attempt opens and
   the return path is what is under test. */
vi.mock("../payments/attempts", () => ({
  reuseLiveAttempt: async () => ({ kind: "none" }),
  recordCheckoutHandle: async () => undefined,
  bookingHasPaymentInFlight: async () => false,
}));
vi.mock("../payments/booking-lease", () => ({
  withBookingOpenLease: async (_subject: string, work: () => Promise<unknown>) => ({ status: "done", result: await work() }),
}));
vi.mock("@/lib/supabase/service", () => ({
  getAdminClient: () => ({
    from: (name: string) => {
      if (name === "transactions") return { insert: async () => ({ error: null }) };
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "limit"]) chain[m] = () => chain;
      chain.maybeSingle = async () => ({ data: name === "rent_payments" ? seam.rentRow : null, error: null });
      return chain;
    },
    rpc: vi.fn(),
  }),
}));

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
                  total_minor: 150_000_000,
                  currency: "NGN",
                }
              : null,
          settled: [],
        }),
    },
  }),
}));

beforeEach(() => {
  seam.initializeTransaction.mockReset();
  seam.chargeSavedCard.mockReset();
  seam.rentRow = null;
  process.env.NEXT_PUBLIC_SITE_URL = "https://vallo.example.invalid";
});

describe("the card paths in checkout.ts return to the right page", () => {
  it("hosted checkout: a rent booking comes back to /rent/pay/<inspectionId>", async () => {
    seam.rentRow = { inspection_id: INSPECTION };
    seam.initializeTransaction.mockResolvedValue({ authorizationUrl: "https://pay.example.invalid/x" });
    const { startCardCheckout } = await import("../bookings/checkout");

    const result = await startCardCheckout({ bookingId: BOOKING, idempotencyKey: "k1" });

    expect(result.ok).toBe(true);
    const call = seam.initializeTransaction.mock.calls[0]?.[0] as { callbackUrl: string; reference: string };
    expect(call.callbackUrl).toBe(
      `https://vallo.example.invalid/rent/pay/${INSPECTION}?paid=1&reference=${call.reference}`,
    );
  });

  it("hosted checkout: a stay still comes back to /checkout/<bookingId>", async () => {
    seam.initializeTransaction.mockResolvedValue({ authorizationUrl: "https://pay.example.invalid/x" });
    const { startCardCheckout } = await import("../bookings/checkout");

    await startCardCheckout({ bookingId: BOOKING, idempotencyKey: "k2" });

    const call = seam.initializeTransaction.mock.calls[0]?.[0] as { callbackUrl: string; reference: string };
    expect(call.callbackUrl).toBe(
      `https://vallo.example.invalid/checkout/${BOOKING}?paid=1&reference=${call.reference}`,
    );
  });

  it("saved card: the fallback hosted page for a rent booking returns to the rent step", async () => {
    seam.rentRow = { inspection_id: INSPECTION };
    seam.chargeSavedCard.mockResolvedValue({
      ok: true,
      data: { kind: "needs_hosted_checkout", authorizationUrl: "https://pay.example.invalid/y" },
    });
    const { payWithSavedCard } = await import("../bookings/checkout");

    const result = await payWithSavedCard({ bookingId: BOOKING, methodId: BOOKING, idempotencyKey: "k3" });

    expect(result.ok).toBe(true);
    const call = seam.chargeSavedCard.mock.calls[0]?.[0] as { callbackUrl: string; reference: string };
    expect(call.callbackUrl).toBe(
      `https://vallo.example.invalid/rent/pay/${INSPECTION}?paid=1&reference=${call.reference}`,
    );
  });
});

/*
 * THE SUCCESS SHEET'S MONEY RULE, AT THE SOURCE (docs/SUCCESS_MOMENTS.md).
 * A saved-card charge answers `settled: true` only when the settlement that
 * follows it applied the money to THIS booking; the panel opens the success
 * sheet on that flag alone and keeps "confirming your payment" otherwise.
 */
describe("saved card: `settled` says whether the charge was applied to this booking", () => {
  async function charged(settlement: unknown, verified: unknown = { status: "success", currency: "NGN", amountMinor: 150_000_000, feesMinor: 0 }) {
    const settlementModule = await import("../bookings/settlement");
    const paystack = await import("../payments/paystack");
    vi.mocked(settlementModule.bookingForReference).mockResolvedValue({ bookingId: BOOKING, guestId: "guest-1" } as never);
    vi.mocked(paystack.verifyTransaction).mockResolvedValue(verified as never);
    vi.mocked(settlementModule.settleBookingCharge).mockResolvedValue(settlement as never);
    seam.chargeSavedCard.mockResolvedValue({ ok: true, data: { kind: "charged" } });
    const { payWithSavedCard } = await import("../bookings/checkout");
    return payWithSavedCard({ bookingId: BOOKING, methodId: BOOKING, idempotencyKey: `k-${Math.random()}` });
  }

  it("true, with the reference, when the settlement landed on this booking", async () => {
    const result = await charged({ outcome: "settled", bookingId: BOOKING, confirmed: true, amountMinor: 150_000_000, totalMinor: 150_000_000, ledger: {} });
    expect(result).toMatchObject({ ok: true, data: { kind: "charged", reference: REFERENCE, settled: true } });
  });

  it("false when the database found it refund-due", async () => {
    const result = await charged({ outcome: "refund-due", bookingId: BOOKING, reason: "agreement_cancelled", amountMinor: 1, reference: REFERENCE });
    expect(result).toMatchObject({ ok: true, data: { kind: "charged", settled: false } });
  });

  it("false when it was already settled and then refunded", async () => {
    const result = await charged({ outcome: "already-settled", bookingId: BOOKING, transactionStatus: "REFUNDED" });
    expect(result).toMatchObject({ ok: true, data: { kind: "charged", settled: false } });
  });

  it("false when the processor could not be asked (the charge is not yet known to be applied)", async () => {
    const paystack = await import("../payments/paystack");
    vi.mocked(paystack.verifyTransaction).mockRejectedValueOnce(new Error("timeout"));
    const settlementModule = await import("../bookings/settlement");
    vi.mocked(settlementModule.bookingForReference).mockResolvedValue({ bookingId: BOOKING, guestId: "guest-1" } as never);
    seam.chargeSavedCard.mockResolvedValue({ ok: true, data: { kind: "charged" } });
    const { payWithSavedCard } = await import("../bookings/checkout");
    const result = await payWithSavedCard({ bookingId: BOOKING, methodId: BOOKING, idempotencyKey: "k-timeout" });
    expect(result).toMatchObject({ ok: true, data: { kind: "charged", settled: false } });
  });
});
