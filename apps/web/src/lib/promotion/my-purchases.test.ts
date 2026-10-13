import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parsePurchases, purchasePhase } = await import("./my-purchases");
const { readMyPromotionPurchases } = await import("./my-purchases-read");

const ROW = {
  id: "p1",
  listing_id: "L1",
  tier: "spotlight",
  amount_minor: 750000,
  currency: "NGN",
  duration_days: 14,
  status: "paid",
  paid_at: "2026-10-07T09:00:00Z",
  starts_at: "2026-10-07T09:00:00Z",
  ends_at: "2026-10-21T09:00:00Z",
  created_at: "2026-10-07T08:59:00Z",
};

describe("parsePurchases", () => {
  it("reads a lister's purchases and keeps unpaid ones without dates", () => {
    const rows = parsePurchases([ROW, { ...ROW, id: "p2", status: "initialized", paid_at: null, starts_at: null, ends_at: null }])!;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ tier: "spotlight", amountMinor: 750000, durationDays: 14 });
    expect(rows[1]).toMatchObject({ status: "initialized", startsAt: null, endsAt: null });
  });
  it("drops a row it cannot trust instead of inventing one, and refuses a non-list", () => {
    expect(parsePurchases([{ ...ROW, tier: "platinum" }, { ...ROW, amount_minor: "x" }, null, "x"])).toEqual([]);
    expect(parsePurchases(null)).toBeNull();
    expect(parsePurchases({})).toBeNull();
  });
});

describe("purchasePhase", () => {
  const paid = { status: "paid", startsAt: ROW.starts_at, endsAt: ROW.ends_at };
  it("is running between its dates, finished after, and neither for anything unpaid", () => {
    expect(purchasePhase(paid, Date.parse("2026-10-10T00:00:00Z"))).toBe("running");
    expect(purchasePhase(paid, Date.parse("2026-11-01T00:00:00Z"))).toBe("finished");
    expect(purchasePhase(paid, Date.parse("2026-10-01T00:00:00Z"))).toBe("other");
    expect(purchasePhase({ ...paid, status: "pending" }, Date.parse("2026-10-10T00:00:00Z"))).toBe("other");
  });
});

describe("readMyPromotionPurchases", () => {
  it("asks the lister's own client for promotion_my_purchases", async () => {
    const calls: string[] = [];
    const supabase = { rpc: async (fn: string) => (calls.push(fn), { data: [ROW], error: null }) };
    expect(await readMyPromotionPurchases(supabase as never)).toHaveLength(1);
    expect(calls).toEqual(["promotion_my_purchases"]);
  });
  it("is null, not an empty list, when the read fails", async () => {
    expect(await readMyPromotionPurchases({ rpc: async () => ({ data: null, error: { code: "x" } }) } as never)).toBeNull();
    expect(await readMyPromotionPurchases({ rpc: async () => { throw new Error("down"); } } as never)).toBeNull();
  });
});
