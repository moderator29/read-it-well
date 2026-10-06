import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { railGate, railForBooking, railInputsForBooking, propertyTypeForBusinessKind, RAIL_REFUSAL } = await import("./router");

/** A fake client answering `from(t).select().eq("id", v).maybeSingle()` from a table map, and `rpc` from a function. */
function fakeDb(tables: Record<string, Record<string, unknown>>, rpc?: (args: unknown) => { data: unknown; error: unknown }) {
  const calls: unknown[] = [];
  return {
    calls,
    from: (t: string) => ({
      select: () => ({
        eq: (_k: string, v: unknown) => ({
          maybeSingle: async () => {
            if (t === "boom") return { data: null, error: { message: "x" } };
            const row = tables[t]?.[v as string];
            return { data: row ?? null, error: null };
          },
        }),
      }),
    }),
    rpc: async (_fn: string, args: unknown) => {
      calls.push(args);
      return rpc ? rpc(args) : { data: null, error: null };
    },
  };
}

describe("railGate: a payment opens only on a resolved rail it can actually open", () => {
  const direct = { state: "resolved", rail: "direct", milestones: false, policyId: "p-d" } as const;
  const escrow = { state: "resolved", rail: "escrow", milestones: false, policyId: "p-e" } as const;

  it("opens a direct answer on the direct rail", () => {
    expect(railGate(direct, "direct", false)).toEqual({ open: true, rail: "direct", policyId: "p-d", milestones: false });
  });

  it("refuses an escrow answer while escrow is not live, and never turns it into direct", () => {
    expect(railGate(escrow, "direct", false)).toEqual({ open: false, reason: "escrow_not_live", message: RAIL_REFUSAL.escrow_not_live });
  });

  it("refuses an escrow answer on a direct-only caller even once escrow is live", () => {
    expect(railGate(escrow, "direct", true).open).toBe(false);
    expect(railGate(escrow, "escrow", true).open).toBe(true);
  });

  it("refuses no rail and an unreachable router in plain words", () => {
    expect(railGate({ state: "unresolved" }, "direct", true)).toMatchObject({ open: false, reason: "unresolved" });
    expect(railGate({ state: "unavailable" }, "direct", true)).toMatchObject({ open: false, reason: "unavailable" });
  });
});

describe("rail inputs for a booking", () => {
  it("reads property type, intent and the lister kind from agents.type", async () => {
    const db = fakeDb({
      bookings: { b1: { id: "b1", listing_id: "l1", accommodation_id: null } },
      listings: { l1: { id: "l1", property_type: "apartment", listing_intent: "rent", agent_id: "a1" } },
      agents: { a1: { id: "a1", type: "business" } },
    });
    expect(await railInputsForBooking(db, "b1")).toEqual({ propertyType: "apartment", listingIntent: "rent", listerKind: "business" });
  });

  it("a listing with no agent has no lister kind (the resolver then fails closed where kind matters)", async () => {
    const db = fakeDb({
      bookings: { b1: { id: "b1", listing_id: "l1" } },
      listings: { l1: { id: "l1", property_type: "apartment", listing_intent: "rent", agent_id: null } },
    });
    expect(await railInputsForBooking(db, "b1")).toEqual({ propertyType: "apartment", listingIntent: "rent", listerKind: null });
  });

  it("a room booking is its business's kind, listed by a business", async () => {
    const db = fakeDb({
      bookings: { b2: { id: "b2", listing_id: null, accommodation_id: "acc" } },
      accommodations: { acc: { id: "acc", business_id: "biz" } },
      businesses: { biz: { id: "biz", kind: "hotel" } },
    });
    expect(await railInputsForBooking(db, "b2")).toEqual({ propertyType: "hotel", listingIntent: "rent", listerKind: "business" });
  });

  it("an unmapped business kind is not guessed", async () => {
    expect(propertyTypeForBusinessKind("resort")).toBeNull();
    expect(propertyTypeForBusinessKind("shortlet_operator")).toBeNull();
    const db = fakeDb({
      bookings: { b2: { id: "b2", accommodation_id: "acc" } },
      accommodations: { acc: { id: "acc", business_id: "biz" } },
      businesses: { biz: { id: "biz", kind: "guest_house" } },
    });
    expect(await railForBooking(db, "b2")).toEqual({ state: "unresolved" });
  });

  it("a missing booking is no rail; a read error is unavailable, never a rail", async () => {
    expect(await railForBooking(fakeDb({}), "nope")).toEqual({ state: "unresolved" });
    const broken = { from: () => { throw new Error("down"); } };
    expect(await railForBooking(broken, "b1")).toEqual({ state: "unavailable" });
  });

  it("asks the resolver with the booking's inputs, on the caller's client", async () => {
    const db = fakeDb(
      {
        bookings: { b1: { id: "b1", listing_id: "l1" } },
        listings: { l1: { id: "l1", property_type: "hotel", listing_intent: "rent", agent_id: null } },
      },
      () => ({ data: { rail: "direct", milestones: false, policy_id: "p-h" }, error: null }),
    );
    expect(await railForBooking(db, "b1")).toEqual({ state: "resolved", rail: "direct", milestones: false, policyId: "p-h" });
    expect(db.calls).toEqual([{ p_property_type: "hotel", p_listing_intent: "rent", p_lister_kind: null }]);
  });
});
