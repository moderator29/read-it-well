import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * Founder ruling 3 (13 October 2026): Vallo's commission on a hotel room is
 * 10 percent (1,000 bps) of the charge, taken from the hotel's share, never
 * added to the guest's price. The database computes it
 * (`private.b3_commission_for_booking`, pov06 applied 13 October 2026, probe pov06) and
 * `payment_split_for_booking` returns the split; the app opens the charge
 * only when the three parts add up to the booking's own total to the kobo.
 */

vi.mock("./router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./router")>();
  return {
    ...actual,
    railForBooking: async () => ({ state: "resolved", rail: "direct", milestones: false, policyId: "pol-hotel", payerMayChoose: false }),
  };
});
vi.mock("./providers", () => ({ escrowRailLive: async () => false }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("./paystack", () => ({ currentPaystackMode: () => "test", guaranteeReserveSubaccount: () => null }));

const { quoteSplit, isRefusal, PAYMENT_NOT_AVAILABLE } = await import("./split-attempt");

/** What the database answers for a room at `total` kobo, at `bps`. */
function hotelSplit(total: number, bps: number) {
  const commission = Math.floor((total * bps) / 10_000);
  return {
    status: "ok", agreement_id: "ag-room", amount_minor: total, payee_user_id: "hotel-owner",
    payee_subaccount_code: "ACCT_hotel", guarantee_minor: 0, commission_minor: commission,
    lister_share_minor: total - commission, commission_bps: bps,
  };
}

function db(split: Record<string, unknown>) {
  return {
    rpc: vi.fn(async (fn: string) =>
      fn === "agreement_payable_for" ? { data: { status: "payable", rail: "direct" }, error: null } : { data: split, error: null }),
  };
}

describe("a hotel room at 10 percent", () => {
  for (const total of [16_000_000, 3_333_333, 99, 1]) {
    it(`opens ${total} kobo with the hotel's share reduced and Vallo's increased, summing exactly`, async () => {
      const quote = await quoteSplit(db(hotelSplit(total, 1000)) as never, { id: "bk-room", total_minor: total, currency: "NGN" });
      if (isRefusal(quote)) throw new Error(quote.message);
      expect(quote.amountMinor).toBe(total);
      expect(quote.commissionMinor).toBe(Math.floor((total * 1000) / 10_000));
      expect(quote.split.listerShareMinor + quote.split.guaranteeMinor + quote.commissionMinor).toBe(total);
      expect(quote.split.listerShareMinor).toBe(total - Math.floor(total / 10));
    });
  }

  it("the guest's price is the booking's own total: a split for any other amount is refused", async () => {
    const split = { ...hotelSplit(16_000_000, 1000), amount_minor: 17_600_000 };
    expect(await quoteSplit(db(split) as never, { id: "bk-room", total_minor: 16_000_000, currency: "NGN" })).toEqual({
      refused: true,
      message: PAYMENT_NOT_AVAILABLE.amount_mismatch,
    });
  });

  it("parts that do not add up are refused, never opened", async () => {
    const split = { ...hotelSplit(16_000_000, 1000), lister_share_minor: 14_500_000 };
    expect(await quoteSplit(db(split) as never, { id: "bk-room", total_minor: 16_000_000, currency: "NGN" })).toEqual({
      refused: true,
      message: PAYMENT_NOT_AVAILABLE.amount_mismatch,
    });
  });
});
