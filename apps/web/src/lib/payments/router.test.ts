import { describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown }, throws: false, args: null as unknown }));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (_fn: string, args: unknown) => {
      if (seam.throws) throw new Error("network");
      seam.args = args;
      return seam.result;
    },
  }),
}));

const { resolveRail, readRailAnswer } = await import("./router");

describe("rail router fails closed", () => {
  it("reads a resolved answer", () => {
    expect(readRailAnswer({ rail: "escrow", milestones: true, policy_id: "p1" })).toEqual({
      state: "resolved", rail: "escrow", milestones: true, policyId: "p1",
    });
    expect(readRailAnswer([{ rail: "direct", milestones: false, policy_id: "p2" }])).toMatchObject({ rail: "direct" });
  });

  it("treats null, an unknown rail or a missing policy as no rail", () => {
    expect(readRailAnswer({ rail: null, milestones: null, policy_id: null })).toEqual({ state: "unresolved" });
    expect(readRailAnswer({ rail: "wallet", policy_id: "p" })).toEqual({ state: "unresolved" });
    expect(readRailAnswer({ rail: "escrow" })).toEqual({ state: "unresolved" });
    expect(readRailAnswer(null)).toEqual({ state: "unresolved" });
    expect(readRailAnswer([])).toEqual({ state: "unresolved" });
  });

  it("an error or a throw is unavailable, never a rail", async () => {
    seam.result = { data: null, error: { message: "x" } };
    expect(await resolveRail({ propertyType: "hotel", listingIntent: "rent", listerKind: "business" })).toEqual({ state: "unavailable" });
    seam.throws = true;
    expect(await resolveRail({ propertyType: "hotel", listingIntent: "rent", listerKind: "business" })).toEqual({ state: "unavailable" });
    seam.throws = false;
  });

  it("sends exactly the resolver's arguments", async () => {
    seam.result = { data: { rail: "escrow", milestones: false, policy_id: "p3" }, error: null };
    await resolveRail({ propertyType: "apartment", listingIntent: "rent", listerKind: null });
    expect(seam.args).toEqual({ p_property_type: "apartment", p_listing_intent: "rent", p_lister_kind: null });
  });
});
