import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SCHEDULE A VISIT ON THE SERVER: the visit mode is written on both paths,
 * a video visit is refused while calls are off, and one tap books once.
 *
 * The replay guard is replaced by an in-memory one with the same contract
 * (`oncePerTap(scope, user, key, work)`: the first answer for a key is the
 * answer for every replay of it), so what is held is that each action hands
 * its tap key and its own scope to the guard, not the guard itself
 * (`lib/offline/replay-guard` has its own tests).
 */
const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const flags = vi.hoisted(() => ({ videoCallsOn: vi.fn(async () => true) }));
const guard = vi.hoisted(() => {
  const seen = new Map<string, unknown>();
  const scopes: string[] = [];
  return {
    seen,
    scopes,
    tapKey: (value: unknown) => (typeof value === "string" && value.length === 36 ? value : null),
    oncePerTap: async (scope: string, user: string, key: string | null, work: () => Promise<unknown>) => {
      scopes.push(scope);
      if (!key) return work();
      const id = `${scope}:${user}:${key}`;
      if (seen.has(id)) return seen.get(id);
      const result = await work();
      seen.set(id, result);
      return result;
    },
  };
});
vi.mock("../actions/session", () => session);
vi.mock("../calls/flags", () => flags);
vi.mock("../offline/replay-guard", () => guard);
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("../messages/actions", () => ({
  startConversation: vi.fn(async () => ({ ok: true, data: { conversationId: "c" } })),
  sendMessage: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { requestInspection } = await import("./actions");
const { bookViewingSlot } = await import("../viewings/actions");

const USER = "11111111-1111-4111-8111-111111111111";
const LISTING = "33333333-3333-4333-8333-333333333333";
const REQUEST = "44444444-4444-4444-8444-444444444444";
const TAP = "55555555-5555-4555-8555-555555555555";

type Answer = { data: unknown; error: unknown };

function mount(answers: Record<string, Answer>, rpc?: (fn: string, args: Record<string, unknown>) => Answer) {
  const payloads: { table: string; op: string; payload: Record<string, unknown> }[] = [];
  const rpcCalls: [string, Record<string, unknown>][] = [];
  const client = {
    from(table: string) {
      let op = "select";
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${op}`] ?? { data: null, error: null };
      for (const m of ["select", "eq", "in", "limit", "order"]) chain[m] = () => chain;
      for (const m of ["insert", "update"]) {
        chain[m] = (payload: Record<string, unknown>) => {
          op = m;
          payloads.push({ table, op: m, payload });
          return chain;
        };
      }
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      chain["then"] = (resolve: (v: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push([fn, args]);
      return rpc ? rpc(fn, args) : { data: REQUEST, error: null };
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: USER }, supabase: client });
  return { payloads, rpcCalls };
}

function lagosTomorrow(hh = "10"): string {
  const day = new Date(Date.now() + 86_400_000 + 3_600_000).toISOString().slice(0, 10);
  return `${day}T${hh}:00`;
}

beforeEach(() => {
  vi.clearAllMocks();
  flags.videoCallsOn.mockResolvedValue(true);
  guard.seen.clear();
  guard.scopes.length = 0;
});

describe("requestInspection writes the visit mode", () => {
  const listingRead = { "listings:select": { data: { id: LISTING, is_demo: false }, error: null } };

  it("writes video when asked for video", async () => {
    const { payloads } = mount({ ...listingRead, "inspection_requests:insert": { data: { id: REQUEST }, error: null } });
    const result = await requestInspection({ listingId: LISTING, when: lagosTomorrow(), mode: "video" });
    expect(result.ok).toBe(true);
    expect(payloads.find((p) => p.op === "insert")?.payload["visit_mode"]).toBe("video");
  });

  it("leaves the column's default when no mode is sent, as every older caller does", async () => {
    const { payloads } = mount({ ...listingRead, "inspection_requests:insert": { data: { id: REQUEST }, error: null } });
    await requestInspection({ listingId: LISTING, when: lagosTomorrow() });
    expect(payloads.find((p) => p.op === "insert")?.payload).not.toHaveProperty("visit_mode");
  });

  it("refuses a video visit while calls are off, and writes nothing", async () => {
    flags.videoCallsOn.mockResolvedValue(false);
    const { payloads } = mount({ ...listingRead, "inspection_requests:insert": { data: { id: REQUEST }, error: null } });
    const result = await requestInspection({ listingId: LISTING, when: lagosTomorrow(), mode: "video" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Video visits are not available");
    expect(payloads).toHaveLength(0);
  });

  it("refuses a mode the column does not hold", async () => {
    mount(listingRead);
    const result = await requestInspection({ listingId: LISTING, when: lagosTomorrow(), mode: "drone" });
    expect(result.ok).toBe(false);
  });

  it("answers a replayed tap with the first request, filing once", async () => {
    const { payloads } = mount({ ...listingRead, "inspection_requests:insert": { data: { id: REQUEST }, error: null } });
    const first = await requestInspection({ listingId: LISTING, when: lagosTomorrow(), mode: "in_person", tapKey: TAP });
    const again = await requestInspection({ listingId: LISTING, when: lagosTomorrow(), mode: "in_person", tapKey: TAP });
    expect(again).toEqual(first);
    expect(payloads.filter((p) => p.op === "insert")).toHaveLength(1);
    expect(guard.scopes).toContain("outbox.inspection");
  });
});

describe("bookViewingSlot writes the visit mode and books once per tap", () => {
  const slot = new Date(Date.now() + 2 * 86_400_000).toISOString();

  it("books in person with the three arguments both database versions take", async () => {
    const { rpcCalls } = mount({});
    const result = await bookViewingSlot({ listingId: LISTING, slotAt: slot });
    expect(result).toEqual({ ok: true, data: { id: REQUEST } });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]![1]).not.toHaveProperty("p_mode");
  });

  it("books video in the same insert when the database takes p_mode", async () => {
    const { rpcCalls, payloads } = mount({});
    await bookViewingSlot({ listingId: LISTING, slotAt: slot, mode: "video" });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]![1]).toMatchObject({ p_mode: "video" });
    expect(payloads.some((p) => p.payload["visit_mode"] !== undefined)).toBe(false);
  });

  it("falls back to booking then writing the mode before the migration is applied", async () => {
    const { rpcCalls, payloads } = mount({}, (_fn, args) =>
      "p_mode" in args
        ? { data: null, error: { code: "PGRST202", message: "Could not find the function public.book_viewing_slot" } }
        : { data: REQUEST, error: null },
    );
    const result = await bookViewingSlot({ listingId: LISTING, slotAt: slot, mode: "video" });
    expect(result.ok).toBe(true);
    expect(rpcCalls).toHaveLength(2);
    expect(payloads.find((p) => p.table === "inspection_requests" && p.payload["visit_mode"] === "video")).toBeTruthy();
  });

  it("refuses a video booking while calls are off, and books nothing", async () => {
    flags.videoCallsOn.mockResolvedValue(false);
    const { rpcCalls } = mount({});
    const result = await bookViewingSlot({ listingId: LISTING, slotAt: slot, mode: "video" });
    expect(result.ok).toBe(false);
    expect(rpcCalls).toHaveLength(0);
  });

  it("answers a double tap with the first booking instead of 'already booked'", async () => {
    let booked = false;
    const { rpcCalls } = mount({}, () => {
      if (booked) return { data: null, error: { hint: "viewing_already_booked" } };
      booked = true;
      return { data: REQUEST, error: null };
    });
    const first = await bookViewingSlot({ listingId: LISTING, slotAt: slot, tapKey: TAP });
    const again = await bookViewingSlot({ listingId: LISTING, slotAt: slot, tapKey: TAP });
    expect(first).toEqual({ ok: true, data: { id: REQUEST } });
    expect(again).toEqual(first);
    expect(rpcCalls).toHaveLength(1);
    expect(guard.scopes).toContain("outbox.viewing");
  });
});
