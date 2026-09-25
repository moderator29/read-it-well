import { describe, expect, it, vi } from "vitest";
import { readSettlement, settleBookingCharge } from "./settlement";
import type { AdminClient } from "@/lib/supabase/service";

/*
 * MON-05 / OPS-02. Settlement is one database call now, and the only thing the
 * application decides is how to read its answer. A charge the processor took
 * that could not be applied comes back as "refund-due" (back to the card, never
 * a wallet: Vallo holds no money); it must never
 * read as "settled" (which would send a confirmation) or throw (which would
 * make the webhook answer 500 and Paystack retry for 72 hours).
 */
function adminAnswering(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data, error }));
  return { admin: { rpc } as unknown as AdminClient, rpc };
}

describe("settleBookingCharge", () => {
  it("asks the database, with the processor's amount and fee and the metadata booking", async () => {
    const { admin, rpc } = adminAnswering({ outcome: "already-settled", booking_id: "b1" });
    await settleBookingCharge(admin, {
      reference: "rm-book-1",
      amountMinor: 1500.7,
      processorFeeMinor: 30,
      fallbackBookingId: "b1",
    });
    expect(rpc).toHaveBeenCalledWith("settle_booking_charge", {
      p_reference: "rm-book-1",
      p_amount_minor: 1500,
      p_processor_fee_minor: 30,
      p_fallback_booking: "b1",
    });
  });

  it("reads a second payment as a refund due to the card, not as settled", async () => {
    const { admin } = adminAnswering({
      outcome: "refund-due",
      booking_id: "b1",
      reason: "already_paid",
      amount_minor: 2000,
      reference: "r",
    });
    const out = await settleBookingCharge(admin, { reference: "r", amountMinor: 2000 });
    expect(out).toEqual({
      outcome: "refund-due",
      bookingId: "b1",
      reason: "already_paid",
      amountMinor: 2000,
      reference: "r",
    });
  });

  it("refuses the retired wallet outcome rather than reading it as anything", () => {
    expect(() => readSettlement({ outcome: "returned-to-wallet", booking_id: "b1" })).toThrow();
  });

  it("throws when the database call fails, so the caller can retry", async () => {
    const { admin } = adminAnswering(null, { message: "connection reset" });
    await expect(settleBookingCharge(admin, { reference: "r", amountMinor: 1 })).rejects.toThrow(
      "connection reset",
    );
  });
});

describe("readSettlement", () => {
  it("reads a settlement with its ledger", () => {
    expect(
      readSettlement({
        outcome: "settled",
        booking_id: "b1",
        confirmed: true,
        amount_minor: 1000,
        ledger: {
          grossMinor: 1000,
          platformFeeMinor: 0,
          agentShareMinor: 985,
          processorFeeMinor: 15,
          netSettlementMinor: 985,
        },
      }),
    ).toEqual({
      outcome: "settled",
      bookingId: "b1",
      confirmed: true,
      amountMinor: 1000,
      ledger: {
        grossMinor: 1000,
        platformFeeMinor: 0,
        agentShareMinor: 985,
        processorFeeMinor: 15,
        netSettlementMinor: 985,
        guaranteeMinor: 0,
      },
    });
  });

  it("refuses an answer it was never promised", () => {
    expect(() => readSettlement({ outcome: "posted" })).toThrow();
    expect(() => readSettlement(null)).toThrow();
  });
});
