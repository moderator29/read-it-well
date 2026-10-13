import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guest's flow with table deposits (track/restaurant-deposits): a request
 * at a venue whose rule asks a deposit comes back carrying the database's own
 * quote, so the form shows the one step left; a free table, or the switch
 * off, comes back exactly as before with no payment step. And the venue that
 * tries to confirm an unpaid table is told why, in words.
 */

const state = vi.hoisted(() => ({
  flag: true,
  quote: { status: "ok", amount_minor: 2_000_000, refund_until: "2026-10-15T18:30:00Z", refund_until_hours: 24, per_guest: true } as Record<string, unknown>,
  rpcs: [] as string[],
  updateError: null as { message: string } | null,
}));

function chain(table: string) {
  let op = "select";
  const c: Record<string, unknown> = {};
  const settle = () => {
    if (table === "businesses") return { data: { id: BUSINESS, is_demo: false }, error: null };
    if (table === "reservations" && op === "insert") return { data: { id: RESERVATION }, error: null };
    if (table === "reservations" && op === "update") return { data: null, error: state.updateError };
    return { data: null, error: null };
  };
  for (const m of ["select", "eq", "neq", "in", "or", "order", "limit"]) c[m] = () => c;
  c.insert = () => ((op = "insert"), c);
  c.update = () => ((op = "update"), c);
  c.single = async () => settle();
  c.maybeSingle = async () => settle();
  c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(settle()).then(resolve);
  return c;
}

const client = {
  from: (table: string) => chain(table),
  rpc: async (fn: string) => {
    state.rpcs.push(fn);
    return { data: state.quote, error: null };
  },
};

vi.mock("../flags/read", () => ({ flagIsOn: async () => state.flag }));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../security/rate-limit", () => ({
  consume: async () => ({ allowed: true, retryIn: "soon" }),
  subjectForUser: (id: string) => `user:${id}`,
}));
vi.mock("../messages/actions", () => ({
  startReservationThread: async () => ({ ok: false, error: "no thread" }),
  sendMessage: async () => ({ ok: true, data: { id: "m" } }),
}));
vi.mock("../actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", user: { id: "11111111-1111-4111-8111-111111111111" }, supabase: client }),
}));

const BUSINESS = "44444444-4444-4444-8444-444444444444";
const RESERVATION = "55555555-5555-4555-8555-555555555555";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const soon = () => new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  Object.assign(state, {
    flag: true,
    rpcs: [],
    updateError: null,
    quote: { status: "ok", amount_minor: 2_000_000, refund_until: "2026-10-15T18:30:00Z", refund_until_hours: 24, per_guest: true },
  });
});

describe("reserveTable with deposits", () => {
  it("a table the rule asks a deposit of comes back with the database's quote", async () => {
    const { reserveTable } = await import("./actions");
    const r = await reserveTable(null, form({ businessId: BUSINESS, date: soon(), time: "19:30", partySize: "4" }));
    expect(r.ok && r.data.deposit).toEqual({
      amountMinor: 2_000_000,
      refundUntil: "2026-10-15T18:30:00Z",
      refundUntilHours: 24,
      perGuest: true,
    });
    expect(state.rpcs).toEqual(["reservation_deposit_quote_for"]);
  });

  it("a free table has no payment step", async () => {
    state.quote = { status: "no_deposit" };
    const { reserveTable } = await import("./actions");
    const r = await reserveTable(null, form({ businessId: BUSINESS, date: soon(), time: "19:30", partySize: "2" }));
    expect(r.ok).toBe(true);
    expect(r.ok && "deposit" in r.data).toBe(false);
  });

  it("with the switch off nothing is quoted and the table stays free", async () => {
    state.flag = false;
    const { reserveTable } = await import("./actions");
    const r = await reserveTable(null, form({ businessId: BUSINESS, date: soon(), time: "19:30", partySize: "8" }));
    expect(r.ok && "deposit" in r.data).toBe(false);
    expect(state.rpcs).toHaveLength(0);
  });
});

describe("respondToReservation with an unpaid deposit", () => {
  it("tells the venue to wait for the deposit instead of a generic failure", async () => {
    state.updateError = { message: "reservation_deposit_unpaid: the deposit for this table is not paid yet" };
    const { respondToReservation } = await import("./actions");
    const r = await respondToReservation(null, form({ reservationId: RESERVATION, decision: "CONFIRMED" }));
    expect(!r.ok && r.error).toBe("The guest has not paid the deposit yet. You can confirm this table once it is paid.");
  });
});
