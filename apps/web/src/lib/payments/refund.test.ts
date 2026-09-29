import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * ONE REFUND, ONE CALL (29 September 2026). The webhook and the payer's return
 * (verify) can both be told "refund-due" for the same charge at the same
 * moment. Only the caller that takes the database claim may call Paystack.
 *
 * The fake database below answers claim_card_refund the way the SQL does (an
 * insert on the key that only a `failed` claim may overwrite), so the tests
 * exercise the real refundChargeToCard against it with both paths in flight
 * at once. The SQL itself is proved by probe mon-refund-claim.
 */

const paystack = vi.hoisted(() => ({ refundTransaction: vi.fn() }));
vi.mock("./paystack", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./paystack")>();
  return { ...actual, refundTransaction: paystack.refundTransaction };
});
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/money/audit", () => ({ recordMoneyAudit: vi.fn(async () => {}) }));

import { PaystackError, PaystackUnknownOutcome } from "./paystack";
import { refundChargeToCard, submitBookingRefund } from "./refund";
import { REFUND_ALREADY_CLAIMED, REFUND_CLAIM_UNAVAILABLE, UNKNOWN_OUTCOME } from "./refund-outcomes";
import type { AdminClient } from "@/lib/supabase/service";

type Row = { state: string; attempts: number; claimedAt: string; refundId: string | null };

function fakeDb(options?: { claimFails?: boolean }) {
  const claims = new Map<string, Row>();
  const updates: Array<{ table: string; values: unknown }> = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    // A round trip, so two callers really are in flight together.
    await new Promise((resolve) => setTimeout(resolve, 1));
    if (name === "claim_card_refund") {
      if (options?.claimFails) return { data: null, error: { message: "connection refused" } };
      const key = String(args.p_key);
      const row = claims.get(key);
      if (!row || row.state === "failed") {
        claims.set(key, { state: "claimed", attempts: (row?.attempts ?? 0) + 1, claimedAt: new Date().toISOString(), refundId: null });
        return { data: { claimed: true, attempt: (row?.attempts ?? 0) + 1 }, error: null };
      }
      return { data: { claimed: false, state: row.state, claimed_at: row.claimedAt }, error: null };
    }
    if (name === "settle_card_refund_claim") {
      const row = claims.get(String(args.p_key));
      if (row && row.state === "claimed") {
        row.state = String(args.p_state);
        row.refundId = (args.p_processor_refund_id as string) || null;
      }
      return { data: { status: "ok" }, error: null };
    }
    return { data: null, error: null };
  });
  const from = vi.fn((table: string) => {
    const chain = {
      update: (values: unknown) => {
        updates.push({ table, values });
        return { eq: async () => ({ error: null }) };
      },
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: { provider_ref: "rm-book-1" }, error: null }),
    };
    return chain;
  });
  return { admin: { rpc, from } as unknown as AdminClient, claims, updates, rpc };
}

const slowSuccess = () =>
  paystack.refundTransaction.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { refundId: "rf_1", status: "pending" };
  });

describe("refundChargeToCard: a charge is refunded once", () => {
  beforeEach(() => {
    paystack.refundTransaction.mockReset();
  });

  it("webhook and verify firing together call Paystack exactly once", async () => {
    const db = fakeDb();
    slowSuccess();
    const [webhook, verify] = await Promise.all([
      refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } }),
      refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "user", userId: "u1" } }),
    ]);
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(1);
    const results = [webhook, verify];
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === REFUND_ALREADY_CLAIMED)).toHaveLength(1);
    expect(db.claims.get("charge:rm-book-1")).toMatchObject({ state: "submitted", refundId: "rf_1" });
  });

  it("ten concurrent deliveries still call Paystack once", async () => {
    const db = fakeDb();
    slowSuccess();
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } }),
      ),
    );
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("a later replay after the refund was submitted calls nothing", async () => {
    const db = fakeDb();
    slowSuccess();
    await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } });
    const replay = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "sweep" } });
    expect(replay).toEqual({ ok: false, reason: REFUND_ALREADY_CLAIMED });
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(1);
  });

  it("an explicit refusal frees the claim for one retry", async () => {
    const db = fakeDb();
    paystack.refundTransaction.mockRejectedValueOnce(new PaystackError("Transaction is not refundable", 400));
    const first = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } });
    expect(first.ok).toBe(false);
    expect(db.claims.get("charge:rm-book-1")?.state).toBe("failed");
    slowSuccess();
    const retry = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "sweep" } });
    expect(retry).toEqual({ ok: true, refundId: "rf_1" });
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(2);
  });

  it("no answer from Paystack keeps the claim: never retried blind", async () => {
    const db = fakeDb();
    paystack.refundTransaction.mockRejectedValueOnce(new PaystackUnknownOutcome("timed out"));
    const first = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } });
    expect(first).toEqual({ ok: false, reason: UNKNOWN_OUTCOME });
    const second = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "user", userId: "u1" } });
    expect(second).toEqual({ ok: false, reason: REFUND_ALREADY_CLAIMED });
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(1);
  });

  it("when the claim cannot be taken, Paystack is not called", async () => {
    const db = fakeDb({ claimFails: true });
    slowSuccess();
    const result = await refundChargeToCard(db.admin, { reference: "rm-book-1", reason: "already_paid", actor: { kind: "webhook" } });
    expect(result).toEqual({ ok: false, reason: REFUND_CLAIM_UNAVAILABLE });
    expect(paystack.refundTransaction).not.toHaveBeenCalled();
  });

  it("a part refund needs its own claim key", async () => {
    const db = fakeDb();
    slowSuccess();
    const result = await refundChargeToCard(db.admin, { reference: "rm-book-1", amountMinor: 500, reason: "goodwill", actor: { kind: "webhook" } });
    expect(result).toEqual({ ok: false, reason: "claim_key_required" });
    expect(paystack.refundTransaction).not.toHaveBeenCalled();
  });

  it("two admins submitting the same part refund row call Paystack once", async () => {
    const db = fakeDb();
    slowSuccess();
    const params = { refundId: "row-1", bookingId: "b1", amountMinor: 5000, reason: "goodwill", actor: { kind: "user" as const, userId: "a1" } };
    const [a, b] = await Promise.all([submitBookingRefund(db.admin, params), submitBookingRefund(db.admin, params)]);
    expect(paystack.refundTransaction).toHaveBeenCalledTimes(1);
    expect([a, b].filter((r) => r.ok)).toHaveLength(1);
    expect(db.claims.has("booking_refund:row-1")).toBe(true);
    // Only the caller that sent the refund records it on the row.
    expect(db.rpc.mock.calls.filter(([name]) => name === "record_processor_refund")).toHaveLength(1);
  });
});
