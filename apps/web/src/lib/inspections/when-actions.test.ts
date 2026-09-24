import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UX-20 on the server: a zone-less picker value is Lagos time whatever zone
 * the sender's phone is in, for a request and a counter-offer alike; and a
 * lister cannot confirm a requested time that has already passed.
 */
const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
vi.mock("../actions/session", () => session);
vi.mock("../messages/actions", () => ({ startConversation: vi.fn(async () => ({ ok: true, data: { conversationId: "c" } })) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { requestInspection, answerInspection } = await import("./actions");

const USER = "11111111-1111-4111-8111-111111111111";
const LISTING = "33333333-3333-4333-8333-333333333333";
const REQUEST = "44444444-4444-4444-8444-444444444444";

type Answer = { data: unknown; error: unknown };

function mount(answers: Record<string, Answer>) {
  const payloads: Record<string, unknown>[] = [];
  const client = {
    from(table: string) {
      let op = "select";
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${op}`] ?? { data: null, error: null };
      for (const m of ["select", "eq"]) chain[m] = () => chain;
      for (const m of ["insert", "update"]) {
        chain[m] = (payload: Record<string, unknown>) => {
          op = m;
          payloads.push(payload);
          return chain;
        };
      }
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      chain["then"] = (resolve: (v: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      return chain;
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: USER }, supabase: client });
  return { payloads };
}

/** A Lagos wall-clock time three days out, as a datetime-local input gives it. */
function lagosInput(daysAhead: number, hh = "14", mm = "30"): { local: string; iso: string } {
  const day = new Date(Date.now() + daysAhead * 86_400_000 + 3_600_000).toISOString().slice(0, 10);
  return { local: `${day}T${hh}:${mm}`, iso: new Date(`${day}T${hh}:${mm}:00+01:00`).toISOString() };
}

beforeEach(() => vi.clearAllMocks());

describe("inspection times on the server", () => {
  it("stores a zone-less request time as Lagos time", async () => {
    const { payloads } = mount({
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:insert": { data: { id: REQUEST }, error: null },
    });
    const t = lagosInput(3);
    await requestInspection({ listingId: LISTING, when: t.local });
    expect(payloads[0]?.["requested_at"]).toBe(t.iso);
  });

  it("stores a zone-less counter-offer as Lagos time", async () => {
    const { payloads } = mount({
      "inspection_requests:select": {
        data: { id: REQUEST, listing_id: LISTING, requested_at: lagosInput(2).iso, state: "REQUESTED" },
        error: null,
      },
    });
    const t = lagosInput(4, "10", "00");
    const result = await answerInspection({ id: REQUEST, state: "PROPOSED", when: t.local });
    expect(result.ok).toBe(true);
    expect(payloads[0]?.["slot_at"]).toBe(t.iso);
  });

  it("refuses to confirm a requested time that has passed", async () => {
    const { payloads } = mount({
      "inspection_requests:select": {
        data: { id: REQUEST, listing_id: LISTING, requested_at: new Date(Date.now() - 3_600_000).toISOString(), state: "REQUESTED" },
        error: null,
      },
    });
    const result = await answerInspection({ id: REQUEST, state: "CONFIRMED" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("has passed");
    expect(payloads).toHaveLength(0);
  });
});
