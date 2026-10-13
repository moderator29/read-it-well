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
import { allocateBookingRefund, refundChargeToCard, submitBookingRefund } from "./refund";
import { REFUND_ALREADY_CLAIMED, REFUND_CLAIM_UNAVAILABLE, UNKNOWN_OUTCOME } from "./refund-outcomes";
import type { AdminClient } from "@/lib/supabase/service";

type Row = { state: string; attempts: number; claimedAt: string; refundId: string | null };

function fakeDb(options?: { claimFails?: boolean; charges?: unknown[]; claims?: unknown[] }) {
  const claims = new Map<string, Row>();
  const plans = new Map<string, { id: string; provider_ref: string; amount_minor: number; claim_key: string; processor_status: string }[]>();
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
    if (name === "card_refund_claims_for") return { data: options?.claims ?? [], error: null };
    if (name === "plan_booking_refund") {
      const id = String(args.p_refund);
      const stored = plans.get(id);
      if (stored) return { data: { status: "existing", parts: stored }, error: null };
      if (args.p_parts === null) return { data: { status: "none" }, error: null };
      const charges = (options?.charges ?? []) as { id: string; provider_ref: string }[];
      const parts = (args.p_parts as { transaction_id: string; amount_minor: number }[]).map((p, n) => {
        const ref = charges.find((c) => c.id === p.transaction_id)!.provider_ref;
        return { id: `part-${n}`, provider_ref: ref, amount_minor: p.amount_minor, claim_key: `booking_refund:${id}:${ref}`, processor_status: "pending" };
      });
      plans.set(id, parts);
      return { data: { status: "existing", parts }, error: null };
    }
    if (name === "record_refund_part") {
      for (const parts of plans.values()) {
        const part = parts.find((p) => p.id === args.p_part);
        if (part) part.processor_status = String(args.p_status);
      }
      return { data: { status: "ok" }, error: null };
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
      then: (resolve: (v: unknown) => unknown) =>
        resolve({ data: options?.charges ?? [{ id: "t1", provider_ref: "rm-book-1", share_payer_id: null, amount_minor: 100_000 }], error: null }),
    };
    return chain;
  });
  return { admin: { rpc, from } as unknown as AdminClient, claims, updates, rpc, plans };
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


describe("D40: a booking refund is split across the cards that paid for it", () => {
  const share = (ref: string, payer: string, amount: number, refunded = 0) => ({
    provider_ref: ref, share_payer_id: payer, amount_minor: amount, refunded_minor: refunded,
  });

  it("splits in proportion to what each card paid, summing exactly", () => {
    const plan = allocateBookingRefund([share("ada", "ada", 60_000), share("bola", "bola", 40_000)], 50_001);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.parts.map((p) => [p.charge.provider_ref, p.amountMinor])).toEqual([["ada", 30_001], ["bola", 20_000]]);
    expect(plan.parts.reduce((s, p) => s + p.amountMinor, 0)).toBe(50_001);
  });

  it("a refund larger than the lead flatmate's share still works", () => {
    const plan = allocateBookingRefund([share("lead", "booker", 30_000), share("mate", "mate", 70_000)], 100_000);
    expect(plan.ok && plan.parts.map((p) => p.amountMinor)).toEqual([30_000, 70_000]);
  });

  it("counts what each card already refunded", () => {
    const plan = allocateBookingRefund([share("ada", "ada", 60_000, 60_000), share("bola", "bola", 40_000)], 40_000);
    expect(plan.ok && plan.parts.map((p) => [p.charge.provider_ref, p.amountMinor])).toEqual([["bola", 40_000]]);
    expect(allocateBookingRefund([share("ada", "ada", 60_000, 59_000), share("bola", "bola", 40_000)], 41_001)).toEqual({ ok: false, reason: "refund_exceeds_paid" });
  });

  it("refuses rather than guesses", () => {
    const unsplit = { provider_ref: "u", share_payer_id: null, amount_minor: 10, refunded_minor: 0 };
    expect(allocateBookingRefund([unsplit, share("s", "x", 10)], 5)).toEqual({ ok: false, reason: "mixed_charges" });
    expect(allocateBookingRefund([unsplit, { ...unsplit, provider_ref: "v" }], 5)).toEqual({ ok: false, reason: "ambiguous_charge" });
    expect(allocateBookingRefund([], 5)).toEqual({ ok: false, reason: "no_settled_charge" });
    expect(allocateBookingRefund([{ ...unsplit, provider_ref: "" }], 5)).toEqual({ ok: false, reason: "charge_without_reference" });
  });

  const flatmates = [
    { id: "t-ada", provider_ref: "rm-share-ada", share_payer_id: "ada", amount_minor: 60_000 },
    { id: "t-bola", provider_ref: "rm-share-bola", share_payer_id: "bola", amount_minor: 40_000 },
  ];
  const submit = (db: ReturnType<typeof fakeDb>, amountMinor: number) =>
    submitBookingRefund(db.admin, { refundId: "row-d40", bookingId: "b1", amountMinor, reason: "cancelled", actor: { kind: "user", userId: "a1" } });
  const sentRefunds = () => paystack.refundTransaction.mock.calls.map(([p]) => [p.reference, p.amountMinor]);

  it("THE REGRESSION: two flatmate charges, a part refund does not all go to whoever paid last", async () => {
    paystack.refundTransaction.mockReset();
    paystack.refundTransaction.mockImplementation(async (p: { reference: string }) => ({ refundId: `rf_${p.reference}`, status: "pending" }));
    const db = fakeDb({ charges: flatmates });
    expect(await submit(db, 50_000)).toEqual({ ok: true });
    // Before D40: 50,000 to rm-share-bola, the newest charge. Now each card gets its part.
    expect(sentRefunds()).toEqual([["rm-share-ada", 30_000], ["rm-share-bola", 20_000]]);
    expect(db.claims.has("booking_refund:row-d40:rm-share-ada")).toBe(true);
    expect(db.claims.has("booking_refund:row-d40:rm-share-bola")).toBe(true);
  });

  it("a retry after one card refused sends only the missing part, never re-splits", async () => {
    paystack.refundTransaction.mockReset();
    paystack.refundTransaction
      .mockResolvedValueOnce({ refundId: "rf_ada", status: "pending" })
      .mockRejectedValueOnce(new PaystackError("Transaction cannot be refunded"))
      .mockResolvedValueOnce({ refundId: "rf_bola", status: "pending" });
    const db = fakeDb({ charges: flatmates });
    expect(await submit(db, 50_000)).toEqual({ ok: false, reason: "partial_refund" });
    expect(await submit(db, 50_000)).toEqual({ ok: true });
    expect(sentRefunds()).toEqual([["rm-share-ada", 30_000], ["rm-share-bola", 20_000], ["rm-share-bola", 20_000]]);
    const total = db.plans.get("row-d40")!.reduce((sum, p) => sum + p.amount_minor, 0);
    expect(total).toBe(50_000);
  });

  it("a single-charge booking keeps the original claim key and path", async () => {
    paystack.refundTransaction.mockReset();
    paystack.refundTransaction.mockResolvedValue({ refundId: "rf_1", status: "pending" });
    const db = fakeDb();
    expect(await submit(db, 5_000)).toEqual({ ok: true });
    expect(db.claims.has("booking_refund:row-d40")).toBe(true);
    expect(db.plans.size).toBe(0);
  });

  it("a refusal fixed by the data marks the row failed instead of leaving it pending", async () => {
    paystack.refundTransaction.mockReset();
    const db = fakeDb({
      charges: [
        { id: "u", provider_ref: "u", share_payer_id: null, amount_minor: 10_000 },
        { id: "s", provider_ref: "s", share_payer_id: "x", amount_minor: 10_000 },
      ],
    });
    expect(await submit(db, 5_000)).toEqual({ ok: false, reason: "mixed_charges" });
    expect(paystack.refundTransaction).not.toHaveBeenCalled();
    expect(db.rpc.mock.calls.filter(([n, a]) => n === "record_processor_refund" && a.p_status === "failed")).toHaveLength(1);
  });
});
