/**
 * DOC-06: `cancel` and `confirm` had no test. Both are public endpoints that
 * change a booking's status with the service role, so what matters is what
 * they refuse to do: nothing is written for a stranger, a signed-out caller,
 * a paid or started stay, or a non-agent; and when they do write, the
 * transition is guarded by the status it expects to find.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "../testing/fake-supabase";

const state = vi.hoisted(() => ({
  session: null as unknown,
  admin: null as unknown,
  flags: true,
  releaseBookedNights: vi.fn(async () => undefined),
  writeBookedNights: vi.fn(async () => undefined),
  announceConfirmedStay: vi.fn(async () => undefined),
  sent: vi.fn(async () => undefined),
}));

vi.mock("../actions/session", () => ({
  resolveSession: async () => state.session,
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => state.flags }));
vi.mock("../listings/repository", () => ({ getListingRepository: () => ({ byId: async () => null }) }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => state.admin }));
vi.mock("../email/client", () => ({
  bestEffortEmail: async (work: () => Promise<unknown>) => {
    await work();
  },
  sendMessage: (...args: unknown[]) => state.sent(...(args as [])),
}));
vi.mock("../email/recipients", () => ({
  adminOrNull: () => null,
  contactForAgent: async () => null,
  contactForSelf: async () => ({ name: "Ada", email: "ada@example.com" }),
}));
vi.mock("./settlement", () => ({
  releaseBookedNights: (...a: unknown[]) => state.releaseBookedNights(...(a as [])),
  writeBookedNights: (...a: unknown[]) => state.writeBookedNights(...(a as [])),
}));
vi.mock("./arrival", () => ({ announceConfirmedStay: (...a: unknown[]) => state.announceConfirmedStay(...(a as [])) }));

const { cancel, confirm } = await import("./actions");

const GUEST = "11111111-1111-4111-8111-111111111111";
const AGENT_USER = "22222222-2222-4222-8222-222222222222";
const BOOKING = "33333333-3333-4333-8333-333333333333";
const LISTING = "44444444-4444-4444-8444-444444444444";

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

function form(bookingId: string) {
  const f = new FormData();
  f.set("bookingId", bookingId);
  return f;
}

function signedIn(userId: string, client: unknown) {
  state.session = { state: "signed-in", user: { id: userId, email: "x@example.com" }, supabase: client };
}

beforeEach(() => {
  state.flags = true;
  state.releaseBookedNights.mockClear();
  state.writeBookedNights.mockClear();
  state.announceConfirmedStay.mockClear();
  state.sent.mockClear();
});

describe("cancel (the guest's own booking)", () => {
  function setup(opts: { booking?: object | null; paid?: boolean; readError?: boolean } = {}) {
    const own = fakeSupabase({
      bookings: {
        select: opts.readError
          ? { data: null, error: { code: "57014" } }
          : {
              data:
                opts.booking === undefined
                  ? { id: BOOKING, listing_id: LISTING, status: "PENDING", check_in: future(10), check_out: future(12) }
                  : opts.booking,
            },
      },
      transactions: { select: { data: opts.paid ? [{ id: "t1" }] : [] } },
    });
    const admin = fakeSupabase();
    signedIn(GUEST, own.client);
    state.admin = admin.client;
    return { own, admin };
  }

  it("cancels a future, unpaid, pending booking: the update is guarded by status and the nights are released", async () => {
    const { admin } = setup();
    expect(await cancel(null, form(BOOKING))).toMatchObject({ ok: true });
    const [update] = admin.of("bookings", "update");
    expect(update?.values).toEqual({ status: "CANCELLED" });
    expect(update?.filters).toEqual(
      expect.arrayContaining([
        ["eq", "id", BOOKING],
        ["in", "status", ["PENDING", "CONFIRMED"]],
      ]),
    );
    expect(admin.of("booking_state_events", "insert")[0]?.values).toMatchObject({ to_status: "CANCELLED", actor_id: GUEST });
    expect(state.releaseBookedNights).toHaveBeenCalledTimes(1);
    expect(state.sent).toHaveBeenCalledTimes(1);
  });

  it("refuses a signed-out caller and writes nothing", async () => {
    const { admin } = setup();
    state.session = { state: "signed-out" };
    expect(await cancel(null, form(BOOKING))).toMatchObject({ ok: false, error: "signed out" });
    expect(admin.wrote()).toBe(false);
  });

  it("refuses a booking the guest's own client cannot see (someone else's), and writes nothing", async () => {
    const { admin } = setup({ booking: null });
    expect((await cancel(null, form(BOOKING))).ok).toBe(false);
    expect(admin.wrote()).toBe(false);
  });

  it("refuses a malformed id before reading anything", async () => {
    const { own, admin } = setup();
    expect((await cancel(null, form("not-a-uuid"))).ok).toBe(false);
    expect(own.calls).toHaveLength(0);
    expect(admin.wrote()).toBe(false);
  });

  it("refuses a paid stay: money that has moved is cancelled by a person, not a button", async () => {
    const { admin } = setup({ paid: true });
    const out = await cancel(null, form(BOOKING));
    expect(out).toMatchObject({ ok: false });
    expect(JSON.stringify(out)).toMatch(/already been paid/);
    expect(admin.wrote()).toBe(false);
  });

  it("refuses a stay that has already started", async () => {
    const { admin } = setup({
      booking: { id: BOOKING, listing_id: LISTING, status: "CONFIRMED", check_in: future(-1), check_out: future(2) },
    });
    expect(JSON.stringify(await cancel(null, form(BOOKING)))).toMatch(/already started/);
    expect(admin.wrote()).toBe(false);
  });

  it("refuses an already cancelled booking without writing", async () => {
    const { admin } = setup({
      booking: { id: BOOKING, listing_id: LISTING, status: "CANCELLED", check_in: future(5), check_out: future(6) },
    });
    expect((await cancel(null, form(BOOKING))).ok).toBe(false);
    expect(admin.wrote()).toBe(false);
  });

  it("refuses while bookings are paused", async () => {
    const { own, admin } = setup();
    state.flags = false;
    expect((await cancel(null, form(BOOKING))).ok).toBe(false);
    expect(own.calls).toHaveLength(0);
    expect(admin.wrote()).toBe(false);
  });

  it("says the service is down, and writes nothing, when the read fails", async () => {
    const { admin } = setup({ readError: true });
    expect((await cancel(null, form(BOOKING))).ok).toBe(false);
    expect(admin.wrote()).toBe(false);
  });
});

describe("confirm (the listing's agent, or an admin)", () => {
  function setup(opts: { status?: string; agentUser?: string | null; roles?: string[] } = {}) {
    const admin = fakeSupabase({
      bookings: {
        select: {
          data: {
            id: BOOKING,
            listing_id: LISTING,
            guest_id: GUEST,
            status: opts.status ?? "PENDING",
            check_in: future(10),
            check_out: future(12),
            nights: 2,
            total_minor: 5_000_000,
          },
        },
      },
      listings: {
        select: { data: opts.agentUser === null ? null : { agent_id: "a1", agents: { user_id: opts.agentUser ?? AGENT_USER } } },
      },
      user_roles: { select: { data: (opts.roles ?? []).map((role) => ({ role })) } },
    });
    state.admin = admin.client;
    return admin;
  }

  it("lets the listing's agent confirm a pending booking; the update is guarded by PENDING", async () => {
    const admin = setup();
    signedIn(AGENT_USER, fakeSupabase().client);
    expect(await confirm(BOOKING)).toMatchObject({ ok: true });
    const [update] = admin.of("bookings", "update");
    expect(update?.values).toEqual({ status: "CONFIRMED" });
    expect(update?.filters).toEqual(expect.arrayContaining([["eq", "status", "PENDING"]]));
    expect(state.writeBookedNights).toHaveBeenCalledTimes(1);
    expect(state.announceConfirmedStay).toHaveBeenCalledTimes(1);
  });

  it("lets an admin confirm a booking on a listing that is not theirs", async () => {
    const admin = setup({ roles: ["admin"] });
    signedIn(GUEST, fakeSupabase().client);
    expect(await confirm(BOOKING)).toMatchObject({ ok: true });
    expect(admin.of("bookings", "update")).toHaveLength(1);
  });

  it("refuses the guest (or anyone who is neither the agent nor an admin), and writes nothing", async () => {
    const admin = setup();
    signedIn(GUEST, fakeSupabase().client);
    const out = await confirm(BOOKING);
    expect(out.ok).toBe(false);
    expect(JSON.stringify(out)).toMatch(/Only the listing's agent or an administrator/);
    expect(admin.of("bookings", "update")).toHaveLength(0);
    expect(admin.of("booking_state_events", "insert")).toHaveLength(0);
    expect(state.writeBookedNights).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller before reading anything", async () => {
    const admin = setup();
    state.session = { state: "signed-out" };
    expect((await confirm(BOOKING)).ok).toBe(false);
    expect(admin.calls).toHaveLength(0);
  });

  it("refuses to confirm a cancelled booking", async () => {
    const admin = setup({ status: "CANCELLED" });
    signedIn(AGENT_USER, fakeSupabase().client);
    expect((await confirm(BOOKING)).ok).toBe(false);
    expect(admin.of("bookings", "update")).toHaveLength(0);
  });

  it("is idempotent: an already confirmed booking answers ok and writes nothing again", async () => {
    const admin = setup({ status: "CONFIRMED" });
    signedIn(AGENT_USER, fakeSupabase().client);
    expect(await confirm(BOOKING)).toMatchObject({ ok: true });
    expect(admin.of("bookings", "update")).toHaveLength(0);
    expect(state.announceConfirmedStay).not.toHaveBeenCalled();
  });
});
