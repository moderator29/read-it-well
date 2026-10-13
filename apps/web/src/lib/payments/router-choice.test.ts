import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => ({}) }));

const { railForBooking, readBookingRail, isMissingFunction, railGate, RAIL_REFUSAL } = await import("./router");

/*
 * Founder ruling 2 (13 October 2026): the app reads the database's own rail
 * for a booking (`public.payment_rail_for_booking`, pov04, applied 13 October 2026), which
 * applies the policy and the payer's choice exactly as the payment gate does.
 */

function client(answer: { data: unknown; error: unknown }, legacy?: { data: unknown; error: unknown }) {
  const calls: string[] = [];
  return {
    calls,
    rpc: async (fn: string) => {
      calls.push(fn);
      if (fn === "payment_rail_for_booking") return answer;
      return legacy ?? { data: null, error: null };
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
    }),
  };
}

describe("the router reads the database's rail, with the payer's choice applied", () => {
  it("reads escrow (the default) with its policy and that the payer may choose", async () => {
    const db = client({ data: { rail: "escrow", policy_id: "pol-rent", milestones: false, payer_may_choose: true }, error: null });
    expect(await railForBooking(db, "bk")).toEqual({
      state: "resolved", rail: "escrow", milestones: false, policyId: "pol-rent", payerMayChoose: true,
    });
    expect(db.calls).toEqual(["payment_rail_for_booking"]);
  });

  it("reads card chosen as the direct rail, on the same policy row", async () => {
    const db = client({ data: { rail: "direct", policy_id: "pol-rent", milestones: false, payer_may_choose: true }, error: null });
    expect(await railForBooking(db, "bk")).toMatchObject({ rail: "direct", policyId: "pol-rent" });
  });

  it("a hotel room and a sale carry no choice", () => {
    expect(readBookingRail({ rail: "direct", policy_id: "pol-hotel", payer_may_choose: false })).toMatchObject({ payerMayChoose: false });
    expect(readBookingRail({ rail: "escrow", policy_id: "pol-sale", milestones: true, payer_may_choose: false })).toMatchObject({
      rail: "escrow", milestones: true, payerMayChoose: false,
    });
  });

  it("no rail, an unknown rail or no policy is unresolved", () => {
    expect(readBookingRail({ rail: null, policy_id: null })).toEqual({ state: "unresolved" });
    expect(readBookingRail({ rail: "wallet", policy_id: "p" })).toEqual({ state: "unresolved" });
    expect(readBookingRail(null)).toEqual({ state: "unresolved" });
  });

  it("an error other than a missing function is unavailable, never a guess", async () => {
    const db = client({ data: null, error: { code: "42501", message: "permission denied" } });
    expect(await railForBooking(db, "bk")).toEqual({ state: "unavailable" });
  });

  it("before pov04 is applied it reads the policy as it did (the legacy twin)", async () => {
    const db = client({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    /* The fake has no booking, so the legacy path answers unresolved after
       asking for it: what matters is that it went there and did not guess. */
    expect(await railForBooking(db, "bk")).toEqual({ state: "unresolved" });
    expect(isMissingFunction({ code: "PGRST202" })).toBe(true);
    expect(isMissingFunction({ code: "42883" })).toBe(true);
    expect(isMissingFunction({ code: "42501" })).toBe(false);
  });
});

describe("the card path refuses escrow in the right words", () => {
  const escrowChoice = { state: "resolved", rail: "escrow", milestones: false, policyId: "p", payerMayChoose: true } as const;
  it("escrow kept by a payer who may choose: says how to pay by card instead", () => {
    expect(railGate(escrowChoice, "direct", true)).toEqual({ open: false, reason: "escrow_chosen", message: RAIL_REFUSAL.escrow_chosen });
    expect(RAIL_REFUSAL.escrow_chosen).toMatch(/Pay by card/);
    expect(RAIL_REFUSAL.escrow_chosen).toMatch(/Nothing has been charged/);
  });
  it("escrow with no choice (a sale) is still escrow_not_live on a card path", () => {
    expect(railGate({ ...escrowChoice, payerMayChoose: false }, "direct", true)).toMatchObject({ reason: "escrow_not_live" });
  });
  it("card chosen opens on the direct rail", () => {
    expect(railGate({ ...escrowChoice, rail: "direct" }, "direct", false)).toMatchObject({ open: true, rail: "direct" });
  });
});
