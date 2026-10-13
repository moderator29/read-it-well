import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE MOVES ON AN INSPECTION, AS THE SERVER NOW REFUSES THEM.
 *
 * The database guard decides who may move a request where. What these pin is
 * the layer in front of it: each move reads the row, writes only from the
 * state it read, and asks for the row back, because row-level security
 * answers a write it does not allow with zero rows and no error, and the
 * guard waves an unchanged state through. Before this a stranger's tap, a
 * stale screen or a second tab came back "ok" while nothing moved, or a
 * second "yes" rewrote the agreed time. The client is a fake that answers per
 * table and operation and records every filter and payload.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
vi.mock("../actions/session", () => session);
vi.mock("../messages/actions", () => ({ startConversation: vi.fn(async () => ({ ok: true, data: { conversationId: "c" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { requestInspection, answerInspection, acceptProposedTime, closeInspection } = await import("./actions");

const LISTER = "11111111-1111-4111-8111-111111111111";
const RENTER = "22222222-2222-4222-8222-222222222222";
const STRANGER = "99999999-9999-4999-8999-999999999999";
const LISTING = "33333333-3333-4333-8333-333333333333";
const REQUEST = "44444444-4444-4444-8444-444444444444";

type Answer = { data: unknown; error: unknown };
type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };

function mount(me: string, answers: Record<string, Answer>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      calls.push(call);
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${call.op}`] ?? { data: null, error: null };
      chain["select"] = () => chain;
      chain["limit"] = () => chain;
      chain["eq"] = (column: string, value: unknown) => {
        call.filters.push([column, value]);
        return chain;
      };
      chain["in"] = (column: string, value: unknown) => {
        call.filters.push([column, value]);
        return chain;
      };
      for (const op of ["insert", "update"]) {
        chain[op] = (payload: unknown) => {
          call.op = op;
          call.payload = payload;
          return chain;
        };
      }
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      chain["then"] = (resolve: (v: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      return chain;
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: me }, supabase: client });
  const writes = () => calls.filter((c) => c.op === "update" || c.op === "insert");
  return { calls, writes };
}

const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();

function row(fields: Record<string, unknown>): Answer {
  return {
    data: {
      id: REQUEST,
      listing_id: LISTING,
      lister_id: LISTER,
      requester_id: RENTER,
      requested_at: hours(48),
      slot_at: null,
      state: "REQUESTED",
      ...fields,
    },
    error: null,
  };
}

const MOVED_ONE: Answer = { data: [{ id: REQUEST }], error: null };
const MOVED_NONE: Answer = { data: [], error: null };

beforeEach(() => vi.clearAllMocks());

describe("asking", () => {
  it("refuses a second live request for the same home before it writes", async () => {
    const { writes } = mount(RENTER, {
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:select": { data: { id: REQUEST }, error: null },
    });
    const result = await requestInspection({ listingId: LISTING, when: hours(48) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already asked");
    expect(writes()).toHaveLength(0);
  });

  it("says a closed listing is closed, and never asks for another try", async () => {
    mount(RENTER, {
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:insert": {
        data: null,
        error: { message: "This listing has been closed, so it is not taking inspections." },
      },
    });
    const result = await requestInspection({ listingId: LISTING, when: hours(48) });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("has been closed");
      expect(result.error).not.toContain("Try again");
    }
  });

  it("says an unreconfirmed listing is not taking requests", async () => {
    mount(RENTER, {
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:insert": {
        data: null,
        error: { message: "The owner has not reconfirmed this listing is available, so it is not taking new inspections." },
      },
    });
    const result = await requestInspection({ listingId: LISTING, when: hours(48) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toContain("Try again");
  });
});

describe("the lister's answer", () => {
  it("is refused to anybody but the lister, before any write", async () => {
    for (const me of [RENTER, STRANGER]) {
      const { writes } = mount(me, { "inspection_requests:select": row({}) });
      const result = await answerInspection({ id: REQUEST, state: "CONFIRMED" });
      expect(result.ok, me).toBe(false);
      expect(writes(), me).toHaveLength(0);
    }
  });

  it("does not rewrite a viewing that is already confirmed", async () => {
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(72) }),
    });
    const result = await answerInspection({ id: REQUEST, state: "CONFIRMED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already confirmed");
    expect(writes()).toHaveLength(0);
  });

  it("will not confirm a time the renter never asked for", async () => {
    const { writes } = mount(LISTER, { "inspection_requests:select": row({}) });
    const result = await answerInspection({ id: REQUEST, state: "CONFIRMED", when: hours(96) });
    expect(result.ok).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it("writes only from the state it read, and says so when the row moved first", async () => {
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({}),
      "inspection_requests:update": MOVED_NONE,
    });
    const result = await answerInspection({ id: REQUEST, state: "CONFIRMED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("changed while you were looking");
    expect(writes()[0]?.filters).toContainEqual(["state", "REQUESTED"]);
  });

  it("confirms the asked time, from the state it read", async () => {
    const asked = hours(48);
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({ requested_at: asked }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await answerInspection({ id: REQUEST, state: "CONFIRMED" });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.payload).toMatchObject({ state: "CONFIRMED", slot_at: asked });
  });

  it("reschedules a booked viewing by offering another time", async () => {
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(48) }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await answerInspection({ id: REQUEST, state: "PROPOSED", when: hours(96), note: "Sunday suits me." });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.payload).toMatchObject({ state: "PROPOSED", lister_note: "Sunday suits me." });
    expect(writes()[0]?.filters).toContainEqual(["state", "CONFIRMED"]);
  });

  it("cancels a booked viewing with the lister's reason", async () => {
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(48) }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await answerInspection({ id: REQUEST, state: "DECLINED", note: "The flat was let this morning." });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.payload).toEqual({ state: "DECLINED", lister_note: "The flat was let this morning." });
  });
});

describe("taking the offered time", () => {
  it("is the renter's alone", async () => {
    for (const me of [LISTER, STRANGER]) {
      const { writes } = mount(me, {
        "inspection_requests:select": row({ state: "PROPOSED", slot_at: hours(30) }),
      });
      const result = await acceptProposedTime({ id: REQUEST });
      expect(result.ok, me).toBe(false);
      expect(writes(), me).toHaveLength(0);
    }
  });

  it("refuses a time that has already gone", async () => {
    const { writes } = mount(RENTER, {
      "inspection_requests:select": row({ state: "PROPOSED", slot_at: hours(-1) }),
    });
    const result = await acceptProposedTime({ id: REQUEST });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("has passed");
    expect(writes()).toHaveLength(0);
  });

  it("refuses an offer that is no longer open", async () => {
    mount(RENTER, { "inspection_requests:select": row({ state: "WITHDRAWN" }) });
    const result = await acceptProposedTime({ id: REQUEST });
    expect(result.ok).toBe(false);
  });

  it("is not reported done when no row moved", async () => {
    mount(RENTER, {
      "inspection_requests:select": row({ state: "PROPOSED", slot_at: hours(30) }),
      "inspection_requests:update": MOVED_NONE,
    });
    const result = await acceptProposedTime({ id: REQUEST });
    expect(result.ok).toBe(false);
  });

  it("confirms the offered time, from PROPOSED only", async () => {
    const { writes } = mount(RENTER, {
      "inspection_requests:select": row({ state: "PROPOSED", slot_at: hours(30) }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await acceptProposedTime({ id: REQUEST });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.payload).toEqual({ state: "CONFIRMED" });
    expect(writes()[0]?.filters).toContainEqual(["state", "PROPOSED"]);
  });
});

describe("withdrawing, cancelling and saying it happened", () => {
  it("lets the renter cancel a booked viewing", async () => {
    const { writes } = mount(RENTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(30) }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await closeInspection({ id: REQUEST, state: "WITHDRAWN" });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.filters).toContainEqual(["state", "CONFIRMED"]);
  });

  it("refuses a withdrawal from anybody but the renter", async () => {
    const { writes } = mount(LISTER, { "inspection_requests:select": row({}) });
    const result = await closeInspection({ id: REQUEST, state: "WITHDRAWN" });
    expect(result.ok).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it("refuses a request it cannot see, rather than calling nothing a success", async () => {
    const { writes } = mount(STRANGER, {});
    const result = await closeInspection({ id: REQUEST, state: "WITHDRAWN" });
    expect(result.ok).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it("will not mark a viewing done before its time", async () => {
    const { writes } = mount(LISTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(30) }),
    });
    const result = await closeInspection({ id: REQUEST, state: "COMPLETED", outcome: "inspected" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("once its time has come");
    expect(writes()).toHaveLength(0);
  });

  it("will not mark a request done that was never agreed", async () => {
    const { writes } = mount(RENTER, { "inspection_requests:select": row({ requested_at: hours(-5) }) });
    const result = await closeInspection({ id: REQUEST, state: "COMPLETED" });
    expect(result.ok).toBe(false);
    expect(writes()).toHaveLength(0);
  });

  it("marks a viewing done once its time has come, with its outcome", async () => {
    const { writes } = mount(RENTER, {
      "inspection_requests:select": row({ state: "CONFIRMED", slot_at: hours(-2) }),
      "inspection_requests:update": MOVED_ONE,
    });
    const result = await closeInspection({ id: REQUEST, state: "COMPLETED", outcome: "deal_done" });
    expect(result.ok).toBe(true);
    expect(writes()[0]?.payload).toEqual({ state: "COMPLETED", outcome: "deal_done" });
  });

  it("does not touch a closed request", async () => {
    const { writes } = mount(RENTER, { "inspection_requests:select": row({ state: "DECLINED" }) });
    const result = await closeInspection({ id: REQUEST, state: "WITHDRAWN" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("already been closed");
    expect(writes()).toHaveLength(0);
  });
});
