import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A TABLE IS BOUND TO ITS THREAD, ON BOTH SPINES.
 *
 * The loop this pins is the one the b3 migration opened and nothing proved
 * end to end: a reservation is made, a thread is opened for it through
 * `startReservationThread`, the thread's id is stamped back on the row as
 * `conversation_id`, and the words are posted INTO that thread by whoever
 * said them. It is proved twice, because there are two spines and they used
 * to behave differently: a table at a restaurant LISTING, whose host is the
 * listing's agent, and a table at a first-party BUSINESS (M7), whose host is
 * `businesses.owner_id` and whose thread could not open at all before b3
 * taught the party check to resolve a host through either.
 *
 * Three things are asserted about every word posted, because they are the
 * rules that would rot quietly:
 *
 *  - it goes through `sendMessage`, which writes `sender_id` from the
 *    caller's own session. This module never touches `messages` itself, so
 *    `messages.sender_id` cannot be relaxed by a change here and there are no
 *    system rows in a reservation thread.
 *  - the guest speaks the request and the cancellation; the venue speaks the
 *    answer. Each is posted by the side that did the thing.
 *  - a thread that will not open never costs somebody their table. The
 *    reservation stands, `conversation_id` is simply null, and the notify
 *    trigger has already told the other side.
 *
 * And the example refusal is pinned on both spines: `reserveTable` reads
 * `is_demo` and refuses BEFORE it writes or spends a rate-limit token, which
 * is the sentence a person reads. The trigger refuses again underneath, which
 * is the guarantee, and lives in the database where the probe proves it.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const messages = vi.hoisted(() => ({
  startReservationThread: vi.fn(),
  sendMessage: vi.fn(),
}));
const limiter = vi.hoisted(() => ({
  consume: vi.fn(),
  subjectForUser: (id: string) => `user:${id}`,
}));

vi.mock("../actions/session", () => session);
vi.mock("../messages/actions", () => messages);
vi.mock("../security/rate-limit", () => limiter);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { cancelReservation, reserveTable, respondToReservation } = await import("./actions");

const GUEST = "11111111-1111-4111-8111-111111111111";
const HOST = "22222222-2222-4222-8222-222222222222";
const LISTING = "33333333-3333-4333-8333-333333333333";
const BUSINESS = "44444444-4444-4444-8444-444444444444";
const RESERVATION = "55555555-5555-4555-8555-555555555555";
const THREAD = "66666666-6666-4666-8666-666666666666";

type Answer = { data: unknown; error: unknown };

/** One recorded call against the fake client: what table, what verb, what payload. */
type Write = { table: string; op: "insert" | "update"; payload: Record<string, unknown> };

/**
 * A PostgREST-shaped stub. Every builder method returns the chain; the chain
 * is thenable so a filtered update can be awaited without a terminal read,
 * which is exactly how `reserveTable` stamps the thread id.
 */
function fakeClient(answers: Record<string, Answer>, writes: Write[]) {
  const reads: string[] = [];
  return {
    from(table: string) {
      reads.push(table);
      let op: "insert" | "update" | "select" = "select";
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${op}`] ?? { data: null, error: null };
      for (const method of ["select", "eq", "neq", "order", "limit"]) {
        chain[method] = () => chain;
      }
      chain["insert"] = (payload: Record<string, unknown>) => {
        op = "insert";
        writes.push({ table, op, payload });
        return chain;
      };
      chain["update"] = (payload: Record<string, unknown>) => {
        op = "update";
        writes.push({ table, op, payload });
        return chain;
      };
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      chain["then"] = (resolve: (value: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      return chain;
    },
    reads,
  };
}

function mount(answers: Record<string, Answer>, userId = GUEST) {
  const writes: Write[] = [];
  const client = fakeClient(answers, writes);
  session.resolveSession.mockResolvedValue({
    state: "signed-in",
    user: { id: userId },
    supabase: client,
  });
  return { writes, client };
}

/** A date inside the ninety-day window, as the form sends it. */
function soon(): string {
  const at = new Date(Date.now() + 7 * 86_400_000);
  return at.toISOString().slice(0, 10);
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  limiter.consume.mockResolvedValue({ allowed: true, retryIn: "in a minute" });
  messages.startReservationThread.mockResolvedValue({
    ok: true,
    data: { conversationId: THREAD },
  });
  messages.sendMessage.mockResolvedValue({ ok: true, data: { id: "m1" } });
});

describe("reserveTable, the listing spine", () => {
  it("holds the table, opens its thread, stamps the id and speaks as the guest", async () => {
    const { writes } = mount({
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "reservations:insert": { data: { id: RESERVATION }, error: null },
      "reservations:update": { data: null, error: null },
    });

    const result = await reserveTable(
      null,
      form({ listingId: LISTING, date: soon(), time: "19:30", partySize: "2", note: "By the window." }),
    );

    expect(result).toEqual({
      ok: true,
      data: { reservationId: RESERVATION, status: "PENDING", conversationId: THREAD },
    });

    const insert = writes.find((w) => w.table === "reservations" && w.op === "insert");
    expect(insert?.payload).toMatchObject({ listing_id: LISTING, guest_id: GUEST, party_size: 2 });
    expect(insert?.payload).not.toHaveProperty("business_id");

    expect(messages.startReservationThread).toHaveBeenCalledWith({ reservationId: RESERVATION });
    expect(messages.sendMessage).toHaveBeenCalledTimes(1);
    const [spoken] = messages.sendMessage.mock.calls[0] as [{ conversationId: string; body: string }];
    expect(spoken.conversationId).toBe(THREAD);
    expect(spoken.body).toContain("Table for 2 guests");
    expect(spoken.body).toContain("By the window.");

    expect(writes).toContainEqual({
      table: "reservations",
      op: "update",
      payload: { conversation_id: THREAD },
    });
  });

  it("refuses an example restaurant before it writes or spends a token", async () => {
    const { writes } = mount({
      "listings:select": { data: { id: LISTING, is_demo: true }, error: null },
    });

    const result = await reserveTable(
      null,
      form({ listingId: LISTING, date: soon(), time: "19:30", partySize: "2" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("example");
    expect(writes).toHaveLength(0);
    expect(limiter.consume).not.toHaveBeenCalled();
    expect(messages.startReservationThread).not.toHaveBeenCalled();
  });

  it("says the trigger's refusal in the same words when the database is the one that catches it", async () => {
    mount({
      "listings:select": { data: null, error: null },
      "reservations:insert": {
        data: null,
        error: {
          code: "23514",
          message:
            "This listing is an example of what the catalogue will hold. No such property is available.",
        },
      },
    });

    const result = await reserveTable(
      null,
      form({ listingId: LISTING, date: soon(), time: "19:30", partySize: "2" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("example");
  });

  it("keeps the table when the thread will not open", async () => {
    messages.startReservationThread.mockResolvedValue({ ok: false, error: "Messaging is paused." });
    const { writes } = mount({
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "reservations:insert": { data: { id: RESERVATION }, error: null },
    });

    const result = await reserveTable(
      null,
      form({ listingId: LISTING, date: soon(), time: "19:30", partySize: "2" }),
    );

    expect(result).toEqual({
      ok: true,
      data: { reservationId: RESERVATION, status: "PENDING", conversationId: null },
    });
    expect(messages.sendMessage).not.toHaveBeenCalled();
    expect(writes.filter((w) => w.op === "update")).toHaveLength(0);
  });
});

describe("reserveTable, the business spine", () => {
  it("takes the same path at a first-party venue and stamps the same thread", async () => {
    const { writes, client } = mount({
      "businesses:select": { data: { id: BUSINESS, is_demo: false }, error: null },
      "reservations:insert": { data: { id: RESERVATION }, error: null },
      "reservations:update": { data: null, error: null },
    });

    const result = await reserveTable(
      null,
      form({ businessId: BUSINESS, date: soon(), time: "19:30", partySize: "4" }),
    );

    expect(result).toEqual({
      ok: true,
      data: { reservationId: RESERVATION, status: "PENDING", conversationId: THREAD },
    });

    // The venue was read from businesses, never from listings.
    expect(client.reads).toContain("businesses");
    expect(client.reads).not.toContain("listings");

    const insert = writes.find((w) => w.table === "reservations" && w.op === "insert");
    expect(insert?.payload).toMatchObject({ business_id: BUSINESS, guest_id: GUEST, party_size: 4 });
    expect(insert?.payload).not.toHaveProperty("listing_id");

    expect(messages.startReservationThread).toHaveBeenCalledWith({ reservationId: RESERVATION });
    expect(writes).toContainEqual({
      table: "reservations",
      op: "update",
      payload: { conversation_id: THREAD },
    });
  });

  it("refuses an example venue with the same sentence", async () => {
    const { writes } = mount({
      "businesses:select": { data: { id: BUSINESS, is_demo: true }, error: null },
    });

    const result = await reserveTable(
      null,
      form({ businessId: BUSINESS, date: soon(), time: "19:30", partySize: "2" }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("example");
    expect(writes).toHaveLength(0);
  });
});

describe("the answer and the cancellation are posted by the person who made them", () => {
  it("posts the venue's confirmation into the thread and stamps a row that had none", async () => {
    const { writes, client } = mount(
      {
        "reservations:update": {
          data: { id: RESERVATION, party_size: 2, reserved_for: new Date().toISOString(), conversation_id: null },
          error: null,
        },
      },
      HOST,
    );

    const result = await respondToReservation(
      null,
      form({ reservationId: RESERVATION, decision: "CONFIRMED" }),
    );

    expect(result).toEqual({ ok: true, data: null });
    expect(messages.sendMessage).toHaveBeenCalledTimes(1);
    const [spoken] = messages.sendMessage.mock.calls[0] as [{ conversationId: string; body: string }];
    expect(spoken.conversationId).toBe(THREAD);
    expect(spoken.body).toContain("Confirmed");
    // Two updates: the decision, then the stamp. Nothing else was written.
    expect(writes.filter((w) => w.table === "reservations" && w.op === "update")).toHaveLength(2);
    expect(client.reads).not.toContain("messages");
  });

  it("does not re-stamp a reservation that already carries its thread", async () => {
    const { writes } = mount(
      {
        "reservations:update": {
          data: {
            id: RESERVATION,
            party_size: 2,
            reserved_for: new Date().toISOString(),
            conversation_id: THREAD,
          },
          error: null,
        },
      },
      HOST,
    );

    await respondToReservation(null, form({ reservationId: RESERVATION, decision: "CANCELLED" }));

    expect(messages.sendMessage).toHaveBeenCalledTimes(1);
    expect(writes.filter((w) => w.op === "update")).toHaveLength(1);
  });

  it("posts the guest's cancellation into the thread, in the guest's own voice", async () => {
    const { writes, client } = mount({
      "reservations:update": {
        data: { id: RESERVATION, party_size: 3, reserved_for: new Date().toISOString(), conversation_id: null },
        error: null,
      },
    });

    const result = await cancelReservation(null, form({ reservationId: RESERVATION }));

    expect(result).toEqual({ ok: true, data: null });
    const cancelled = writes.find((w) => w.table === "reservations" && w.op === "update");
    expect(cancelled?.payload).toMatchObject({ status: "CANCELLED" });
    const [spoken] = messages.sendMessage.mock.calls[0] as [{ conversationId: string; body: string }];
    expect(spoken.body).toContain("I need to cancel the table for 3 guests");
    expect(client.reads).not.toContain("messages");
  });
});
