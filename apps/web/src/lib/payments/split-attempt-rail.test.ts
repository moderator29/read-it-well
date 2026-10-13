import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  answer: { state: "resolved", rail: "direct", milestones: false, policyId: "pol-hotel" } as Record<string, unknown>,
  escrowLive: false,
  reserve: "ACCT_reserve" as string | null,
  guarantee: 0,
}));
vi.mock("./router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./router")>();
  return { ...actual, railForBooking: async () => state.answer };
});
vi.mock("./providers", () => ({ escrowRailLive: async () => state.escrowLive }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("./paystack", () => ({
  currentPaystackMode: () => "test",
  guaranteeReserveSubaccount: () => state.reserve,
}));

const { quoteSplit, insertSplitAttempt, isRefusal, PAYMENT_NOT_AVAILABLE } = await import("./split-attempt");
const { RAIL_REFUSAL } = await import("./router");

const booking = { id: "b1", total_minor: 10_000, currency: "NGN" };

function admin() {
  const inserted: Record<string, unknown>[] = [];
  const rpc = vi.fn(async (fn?: string) => fn === "agreement_payable_for" ? { data: { status: "payable", rail: "direct" }, error: null } : ({
    data: {
      status: "ok", agreement_id: "ag1", amount_minor: 10_000, payee_user_id: "u1",
      payee_subaccount_code: "ACCT_lister", lister_share_minor: 9_800 - state.guarantee, guarantee_minor: state.guarantee, commission_minor: 200,
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
    state.reserve = "ACCT_reserve";
    state.guarantee = 0;
  });

  it("guarantee 0 with no reserve configured opens, with no reserve leg (D51)", async () => {
    state.reserve = null;
    const quote = await quoteSplit(admin() as never, booking);
    if (isRefusal(quote)) throw new Error(quote.message);
    expect(quote.split).toMatchObject({ reserveSubaccount: null, guaranteeMinor: 0, listerShareMinor: 9_800 });
  });

  it("a guarantee above 0 with no reserve configured refuses, after asking the database", async () => {
    state.reserve = null;
    state.guarantee = 150;
    const db = admin();
    expect(await quoteSplit(db as never, booking)).toEqual({ refused: true, message: PAYMENT_NOT_AVAILABLE.reserve_not_set_up });
    expect(db.rpc).toHaveBeenCalled();
  });

  it("names the rate-not-accepted refusal in neutral words", () => {
    expect(PAYMENT_NOT_AVAILABLE.rate_not_accepted).toMatch(/lister is still confirming/);
    expect(PAYMENT_NOT_AVAILABLE.rate_not_accepted).toMatch(/Nothing has been charged/);
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

describe("D68d: the rail and the risk signals decide before the gate does", () => {
  beforeEach(() => {
    state.answer = { state: "resolved", rail: "direct", milestones: false, policyId: "pol-hotel" };
  });
  it("a deal the resolver sends for review is refused in a sentence, before any row is written", async () => {
    const db = admin();
    db.rpc.mockImplementation((async (fn?: string) =>
      fn === "agreement_payable_for"
        ? { data: { status: "review_required", rail: "direct" }, error: null }
        : {
            data: { status: "ok", agreement_id: "ag1", amount_minor: 10_000, payee_user_id: "u1", payee_subaccount_code: "ACCT_lister", lister_share_minor: 9_800, guarantee_minor: 0, commission_minor: 200 },
            error: null,
          }) as never);
    const quote = await quoteSplit(db as never, booking);
    expect(quote).toEqual({ refused: true, message: PAYMENT_NOT_AVAILABLE.review_required });
    expect(db.inserted).toHaveLength(0);
  });
});
