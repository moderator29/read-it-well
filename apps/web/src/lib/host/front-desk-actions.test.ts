import { beforeEach, describe, expect, it, vi } from "vitest";

const BOOKING = "22222222-2222-4222-8222-222222222222";

const state = vi.hoisted(() => ({
  signedIn: true,
  reply: { data: "2026-10-13T09:00:00+00:00" as unknown, error: null as null | { code?: string; message?: string; hint?: string } },
  calls: [] as [string, Record<string, unknown>][],
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => void state.revalidated.push(path) }));
vi.mock("../actions/session", () => ({
  resolveSession: async () =>
    state.signedIn
      ? {
          state: "signed-in",
          user: { id: "u1" },
          supabase: {
            rpc: async (fn: string, args: Record<string, unknown>) => {
              state.calls.push([fn, args]);
              return state.reply;
            },
          },
        }
      : { state: "signed-out" },
}));

beforeEach(() => {
  Object.assign(state, {
    signedIn: true,
    reply: { data: "2026-10-13T09:00:00+00:00", error: null },
    calls: [],
    revalidated: [],
  });
});

describe("marking a guest checked in or out", () => {
  it("calls the database function under the host's own session and refreshes the desk", async () => {
    const { markStay } = await import("./front-desk-actions");
    expect(await markStay({ bookingId: BOOKING, kind: "checked_in" })).toEqual({ ok: true, at: "2026-10-13T09:00:00+00:00" });
    expect(state.calls).toEqual([["record_stay_event", { p_booking: BOOKING, p_kind: "checked_in" }]]);
    expect(state.revalidated).toEqual(["/host/bookings", "/host"]);
  });

  it("says not available, and refreshes nothing, when the migration is not applied", async () => {
    state.reply = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
    const { markStay } = await import("./front-desk-actions");
    expect(await markStay({ bookingId: BOOKING, kind: "checked_out" })).toEqual({ ok: false, reason: "not_available" });
    expect(state.revalidated).toEqual([]);
  });

  it("passes the database's refusal on as a reason, never as a success", async () => {
    state.reply = { data: null, error: { code: "22023", message: "check the guest in first" } };
    const { markStay } = await import("./front-desk-actions");
    expect(await markStay({ bookingId: BOOKING, kind: "checked_out" })).toEqual({ ok: false, reason: "check_in_first" });
  });

  it("passes a refusal to check in a stay not paid through Vallo on as not_paid", async () => {
    state.reply = {
      data: null,
      error: { code: "22023", message: "this stay is not paid through Vallo yet, so it cannot be checked in", hint: "stay_not_paid" },
    };
    const { markStay } = await import("./front-desk-actions");
    expect(await markStay({ bookingId: BOOKING, kind: "checked_in" })).toEqual({ ok: false, reason: "not_paid" });
    expect(state.revalidated).toEqual([]);
  });

  it("refuses a signed-out caller and a malformed request before calling anything", async () => {
    const { markStay } = await import("./front-desk-actions");
    state.signedIn = false;
    expect(await markStay({ bookingId: BOOKING, kind: "checked_in" })).toEqual({ ok: false, reason: "sign_in" });
    state.signedIn = true;
    expect(await markStay({ bookingId: "not-a-uuid", kind: "checked_in" })).toEqual({ ok: false, reason: "failed" });
    expect(await markStay({ bookingId: BOOKING, kind: "checked_sideways" as never })).toEqual({ ok: false, reason: "failed" });
    expect(state.calls).toEqual([]);
  });
});
