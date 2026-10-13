import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  flag: true,
  instantFlag: false,
  outcomeReads: 0,
  signedIn: true,
  inserted: [] as Record<string, unknown>[],
  insertError: null as null | { code: string; message: string },
}));

vi.mock("../flags/read", () => ({
  ROOM_BOOKINGS_FLAG: "room_bookings",
  STAYS_INSTANT_PAY_FLAG: "stays_instant_pay",
  flagIsOn: async (key: string) => (key === "stays_instant_pay" ? state.instantFlag : state.flag),
}));
vi.mock("../bookings/instant-pay", () => ({
  readInstantOutcome: async () => {
    state.outcomeReads += 1;
    return { instant: true, payBy: "2026-10-07T12:30:00.000Z" };
  },
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () =>
    state.signedIn
      ? {
          state: "signed-in",
          user: { id: "11111111-1111-4111-8111-111111111111" },
          supabase: {
            from: () => ({
              insert: (row: Record<string, unknown>) => {
                state.inserted.push(row);
                return {
                  select: () => ({
                    single: async () =>
                      state.insertError
                        ? { data: null, error: state.insertError }
                        : { data: { id: "22222222-2222-4222-8222-222222222222" }, error: null },
                  }),
                };
              },
            }),
          },
        }
      : { state: "signed-out" },
}));

const STAY = "33333333-3333-4333-8333-333333333333";
const ROOM = "44444444-4444-4444-8444-444444444444";
const RATE = "55555555-5555-4555-8555-555555555555";
const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  Object.assign(state, { flag: true, instantFlag: false, outcomeReads: 0, signedIn: true, inserted: [], insertError: null });
});

describe("requestRoomStay (a guest asks for a room)", () => {
  const input = () => ({ stayId: STAY, roomTypeId: ROOM, ratePlanId: RATE, checkIn: soon(5), checkOut: soon(8), guests: 2, rooms: 1 });

  it("writes only WHICH room and nights, never a price, and hands back the booking", async () => {
    const { requestRoomStay } = await import("./room-booking-actions");
    const result = await requestRoomStay(input());
    expect(result).toEqual({
      ok: true,
      data: { bookingId: "22222222-2222-4222-8222-222222222222", instant: false, payBy: null },
    });
    expect(state.inserted).toHaveLength(1);
    const row = state.inserted[0]!;
    expect(row).toMatchObject({ accommodation_id: STAY, room_type_id: ROOM, rate_plan_id: RATE, rooms: 1, adults: 2, status: "PENDING" });
    for (const priced of ["total_minor", "subtotal_minor", "price_per_night_minor", "nights", "listing_id"]) {
      expect(row).not.toHaveProperty(priced);
    }
  });

  it("refuses while room_bookings is off, before writing anything", async () => {
    state.flag = false;
    const { requestRoomStay } = await import("./room-booking-actions");
    const result = await requestRoomStay(input());
    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });

  it("refuses a signed-out caller and reversed dates", async () => {
    const { requestRoomStay } = await import("./room-booking-actions");
    expect((await requestRoomStay({ ...input(), checkOut: soon(4) })).ok).toBe(false);
    state.signedIn = false;
    expect((await requestRoomStay(input())).ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });

  it("turns the database's refusal into the guest's sentence", async () => {
    state.insertError = { code: "23514", message: "Only 1 of 3 night(s) had 1 room(s) free. Nothing was held." };
    const { requestRoomStay } = await import("./room-booking-actions");
    const result = await requestRoomStay(input());
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toMatch(/not enough of these rooms free/);
  });

  it("D73 off: today's request, and nothing is read back", async () => {
    const { requestRoomStay } = await import("./room-booking-actions");
    const result = await requestRoomStay(input());
    expect(result.ok && result.data.instant).toBe(false);
    expect(state.outcomeReads).toBe(0);
    expect(state.inserted[0]).toMatchObject({ status: "PENDING" });
  });

  it("D73 on: the same PENDING insert, then the database's answer is handed back", async () => {
    state.instantFlag = true;
    const { requestRoomStay } = await import("./room-booking-actions");
    const result = await requestRoomStay(input());
    expect(result).toEqual({
      ok: true,
      data: { bookingId: "22222222-2222-4222-8222-222222222222", instant: true, payBy: "2026-10-07T12:30:00.000Z" },
    });
    expect(state.outcomeReads).toBe(1);
    /* The app never asks for CONFIRMED or sends a price: the database decides. */
    expect(state.inserted[0]).toMatchObject({ status: "PENDING" });
    expect(state.inserted[0]).not.toHaveProperty("total_minor");
  });
});
