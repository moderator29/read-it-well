import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `syncPropertyRatesDraft`: a shortlet gets the one rate a guest books, made
 * from the host's own nightly price and chosen policy, and every rate on a
 * property carries the property's policy.
 *
 * Before it, nothing in the application wrote a rate for a shortlet, so
 * `missingFrom` refused every shortlet application at the review step with
 * "A rate with a cancellation policy" and no step could meet it.
 */
const OWNER = "11111111-1111-4111-8111-111111111111";
const POLICY = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  kind: "shortlet_operator" as string,
  status: "DRAFT" as string,
  property: null as null | {
    id: string;
    cancellation_policy_id: string | null;
    room_types: { id: string; created_at: string; base_rate_minor: number; rate_plans: { id: string; name: string }[] }[];
  },
  updates: [] as { patch: Record<string, unknown>; ids: unknown }[],
  upserts: [] as { row: Record<string, unknown>; options: unknown }[],
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
/* The refusals are read in the request's language (`hostRefusals`); a test has no request. */
vi.mock("../locale", () => ({ getLocale: async () => "en" }));

function table(name: string) {
  let columns = "";
  const chain: Record<string, unknown> = {};
  for (const step of ["eq", "in", "order", "limit"]) chain[step] = () => chain;
  chain.select = (picked: string) => ((columns = picked), chain);
  chain.maybeSingle = async () => {
    if (name === "businesses" && columns === "kind") return { data: { kind: state.kind }, error: null };
    if (name === "businesses") return { data: { id: "biz-1", status: state.status }, error: null };
    if (name === "accommodations") return { data: state.property, error: null };
    return { data: null, error: null };
  };
  chain.update = (patch: Record<string, unknown>) => ({
    in: async (_column: string, ids: unknown) => (state.updates.push({ patch, ids }), { error: null }),
  });
  chain.upsert = async (row: Record<string, unknown>, options: unknown) => (
    state.upserts.push({ row, options }), { error: null }
  );
  return chain;
}

vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: OWNER }, supabase: { from: table } }),
}));

const { syncPropertyRatesDraft } = await import("./actions");

beforeEach(() => {
  state.kind = "shortlet_operator";
  state.status = "DRAFT";
  state.updates = [];
  state.upserts = [];
  state.property = {
    id: "acc-1",
    cancellation_policy_id: POLICY,
    room_types: [{ id: "unit-1", created_at: "2026-10-12T08:00:00Z", base_rate_minor: 8_500_000, rate_plans: [] }],
  };
});

describe("syncPropertyRatesDraft", () => {
  it("gives a shortlet its one rate: room only, at the nightly price typed, on the policy chosen", async () => {
    const result = await syncPropertyRatesDraft();
    expect(result).toEqual({ ok: true, data: { rates: 1 } });
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0]?.row).toEqual({
      room_type_id: "unit-1",
      name: "Nightly rate",
      meal_plan: "room_only",
      cancellation_policy_id: POLICY,
      rate_minor: 8_500_000,
    });
    expect(state.upserts[0]?.options).toEqual({ onConflict: "room_type_id,name" });
  });

  it("does nothing until a policy is chosen, so the place screen can call it before the rules screen", async () => {
    state.property = { ...state.property!, cancellation_policy_id: null };
    expect(await syncPropertyRatesDraft()).toEqual({ ok: true, data: { rates: 0 } });
    expect(state.upserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });

  it("moves every rate of a hotel onto the property's policy and invents no rate for it", async () => {
    state.kind = "hotel";
    state.property = {
      id: "acc-1",
      cancellation_policy_id: POLICY,
      room_types: [
        { id: "rt-1", created_at: "2026-10-12T08:00:00Z", base_rate_minor: 5_000_000, rate_plans: [{ id: "rp-1", name: "Room only" }] },
        { id: "rt-2", created_at: "2026-10-12T09:00:00Z", base_rate_minor: 9_000_000, rate_plans: [{ id: "rp-2", name: "Bed and breakfast" }] },
      ],
    };
    expect(await syncPropertyRatesDraft()).toEqual({ ok: true, data: { rates: 2 } });
    expect(state.updates).toEqual([{ patch: { cancellation_policy_id: POLICY }, ids: ["rp-1", "rp-2"] }]);
    expect(state.upserts).toHaveLength(0);
  });

  it("refuses once the application has been sent, so nothing under review moves", async () => {
    state.status = "SUBMITTED";
    const result = await syncPropertyRatesDraft();
    expect(result.ok).toBe(false);
    expect(state.upserts).toHaveLength(0);
    expect(state.updates).toHaveLength(0);
  });
});
