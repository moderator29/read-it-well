import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  answer: { state: "resolved", rail: "direct", milestones: false, policyId: "pol-hotel" } as Record<string, unknown>,
  escrowLive: false,
}));
vi.mock("./router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./router")>();
  return { ...actual, railForBooking: async () => state.answer };
});
vi.mock("./providers", () => ({ escrowRailLive: async () => state.escrowLive }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("./paystack", () => ({
  currentPaystackMode: () => "test",
  guaranteeReserveSubaccount: () => "ACCT_reserve",
}));

const { quoteSplit, insertSplitAttempt, isRefusal } = await import("./split-attempt");
const { RAIL_REFUSAL } = await import("./router");

const booking = { id: "b1", total_minor: 10_000, currency: "NGN" };

function admin() {
  const inserted: Record<string, unknown>[] = [];
  const rpc = vi.fn(async () => ({
    data: {
      status: "ok", agreement_id: "ag1", amount_minor: 10_000, payee_user_id: "u1",
      payee_subaccount_code: "ACCT_lister", lister_share_minor: 9_800, guarantee_minor: 0, commission_minor: 200,
    },
    error: null,
  }));
  return {
    inserted,
    rpc,
    from: () => ({ insert: async (row: Record<string, unknown>) => { inserted.push(row); return { error: null }; } }),
  };
}

describe("every split payment resolves its rail before it opens", () => {
  beforeEach(() => {
    state.answer = { state: "resolved", rail: "direct", milestones: false, policyId: "pol-hotel" };
    state.escrowLive = false;
  });

  it("a direct answer opens, and the rail and its policy are written on the attempt row", async () => {
    const db = admin();
    const quote = await quoteSplit(db as never, booking);
    if (isRefusal(quote)) throw new Error(quote.message);
    expect(quote).toMatchObject({ rail: "direct", railPolicyId: "pol-hotel" });
    const opened = await insertSplitAttempt(db as never, booking, quote);
    expect(isRefusal(opened)).toBe(false);
    expect(db.inserted[0]).toMatchObject({ rail: "direct", rail_policy_id: "pol-hotel", status: "PENDING" });
  });

  it("an escrow answer is refused before anything is asked or written, switch on or off", async () => {
    for (const live of [false, true]) {
      state.escrowLive = live;
      state.answer = { state: "resolved", rail: "escrow", milestones: false, policyId: "pol-rent" };
      const db = admin();
      expect(await quoteSplit(db as never, booking)).toEqual({ refused: true, message: RAIL_REFUSAL.escrow_not_live });
      expect(db.rpc).not.toHaveBeenCalled();
    }
  });

  it("no rail, or a router that cannot answer, opens nothing", async () => {
    state.answer = { state: "unresolved" };
    expect(await quoteSplit(admin() as never, booking)).toEqual({ refused: true, message: RAIL_REFUSAL.unresolved });
    state.answer = { state: "unavailable" };
    expect(await quoteSplit(admin() as never, booking)).toEqual({ refused: true, message: RAIL_REFUSAL.unavailable });
  });
});
