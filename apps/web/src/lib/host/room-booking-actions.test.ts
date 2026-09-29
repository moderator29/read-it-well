import { beforeEach, describe, expect, it, vi } from "vitest";

const HOST = "11111111-1111-4111-8111-111111111111";
const BOOKING = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({
  booking: null as null | { id: string; status: string; accommodation_id: string | null },
  owner: "" as string,
  updates: [] as { patch: Record<string, unknown>; where: Record<string, unknown> }[],
  events: [] as Record<string, unknown>[],
  moved: true,
  ensured: 0,
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../payments/payee-subaccount", () => ({ ensureHostSubaccount: async () => { state.ensured += 1; return null; } }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({ state: "signed-in", user: { id: HOST } }),
}));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "bookings") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.booking, error: null }) }) }),
          update: (patch: Record<string, unknown>) => {
            const where: Record<string, unknown> = {};
            const chain = {
              eq: (c: string, v: unknown) => ((where[c] = v), chain),
              select: async () => {
                state.updates.push({ patch, where });
                return { data: state.moved ? [{ id: BOOKING }] : [], error: null };
              },
            };
            return chain;
          },
        };
      }
      if (table === "accommodations") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { id: "a", businesses: { owner_id: state.owner } } }) }),
          }),
        };
      }
      return { insert: async (row: Record<string, unknown>) => (state.events.push(row), { error: null }) };
    },
  }),
}));

beforeEach(() => {
  Object.assign(state, {
    booking: { id: BOOKING, status: "PENDING", accommodation_id: "33333333-3333-4333-8333-333333333333" },
    owner: HOST,
    updates: [],
    events: [],
    moved: true,
    ensured: 0,
  });
});

describe("the host answers a room request", () => {
  it("accepts only its own hotel's request, guarded by PENDING, and readies the payout", async () => {
    const { acceptRoomRequest } = await import("./room-booking-actions");
    expect(await acceptRoomRequest(BOOKING)).toEqual({ ok: true, data: null });
    expect(state.updates).toEqual([{ patch: { status: "CONFIRMED" }, where: { id: BOOKING, status: "PENDING" } }]);
    expect(state.events[0]).toMatchObject({ booking_id: BOOKING, from_status: "PENDING", to_status: "CONFIRMED", actor_id: HOST });
    expect(state.ensured).toBe(1);
  });

  it("declines, giving a reason, and does not touch the payout", async () => {
    const { declineRoomRequest } = await import("./room-booking-actions");
    expect(await declineRoomRequest(BOOKING, "Closed for works")).toEqual({ ok: true, data: null });
    expect(state.updates[0]!.patch).toEqual({ status: "CANCELLED" });
    expect(String(state.events[0]!.note)).toMatch(/Closed for works/);
    expect(state.ensured).toBe(0);
  });

  it("refuses somebody else's hotel, a listing booking and an answered request, writing nothing", async () => {
    const { acceptRoomRequest } = await import("./room-booking-actions");
    state.owner = "99999999-9999-4999-8999-999999999999";
    expect((await acceptRoomRequest(BOOKING)).ok).toBe(false);
    state.owner = HOST;
    state.booking = { id: BOOKING, status: "PENDING", accommodation_id: null };
    expect((await acceptRoomRequest(BOOKING)).ok).toBe(false);
    state.booking = { id: BOOKING, status: "CONFIRMED", accommodation_id: "33333333-3333-4333-8333-333333333333" };
    expect((await acceptRoomRequest(BOOKING)).ok).toBe(false);
    expect(state.updates).toHaveLength(0);
  });

  it("says so when the request moved on between the read and the write", async () => {
    state.moved = false;
    const { acceptRoomRequest } = await import("./room-booking-actions");
    const result = await acceptRoomRequest(BOOKING);
    expect(result.ok).toBe(false);
    expect(state.events).toHaveLength(0);
  });
});
