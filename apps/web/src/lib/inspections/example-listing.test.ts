import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * NO INSPECTION IS EVER ARRANGED AT AN EXAMPLE.
 *
 * `inspection_requests_never_against_a_demo_listing` has refused this in the
 * database since 20260809080630. What `requestInspection` did with that
 * refusal was fall through to "We could not send that request. Try again in a
 * moment", which invites somebody to keep knocking on a door that is walled
 * up, and is the same failure the booking path had.
 *
 * The read before the write is the sentence; the trigger is the guarantee.
 * Both are pinned, and so is the case that must keep working: a real listing
 * still takes a request, and the thread is still opened beside it.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const messages = vi.hoisted(() => ({ startConversation: vi.fn() }));

vi.mock("../actions/session", () => session);
vi.mock("../messages/actions", () => messages);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { requestInspection } = await import("./actions");

const USER = "11111111-1111-4111-8111-111111111111";
const LISTING = "33333333-3333-4333-8333-333333333333";
const REQUEST = "44444444-4444-4444-8444-444444444444";
const THREAD = "55555555-5555-4555-8555-555555555555";

type Answer = { data: unknown; error: unknown };

function mount(answers: Record<string, Answer>) {
  const writes: string[] = [];
  const client = {
    from(table: string) {
      let op: "select" | "insert" | "update" = "select";
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => answers[`${table}:${op}`] ?? { data: null, error: null };
      for (const method of ["select", "eq"]) chain[method] = () => chain;
      chain["insert"] = () => {
        op = "insert";
        writes.push(`${table}:insert`);
        return chain;
      };
      chain["update"] = () => {
        op = "update";
        writes.push(`${table}:update`);
        return chain;
      };
      chain["single"] = async () => settle();
      chain["maybeSingle"] = async () => settle();
      chain["then"] = (resolve: (value: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      return chain;
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: USER }, supabase: client });
  return { writes };
}

/** An inspection three days out, inside the ninety-day window. */
function when(): string {
  return new Date(Date.now() + 3 * 86_400_000).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
  messages.startConversation.mockResolvedValue({ ok: true, data: { conversationId: THREAD } });
});

describe("requestInspection", () => {
  it("refuses an example listing before it writes", async () => {
    const { writes } = mount({
      "listings:select": { data: { id: LISTING, is_demo: true }, error: null },
    });

    const result = await requestInspection({ listingId: LISTING, when: when() });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("example listing");
      expect(result.error).not.toContain("Try again");
    }
    expect(writes).toHaveLength(0);
    expect(messages.startConversation).not.toHaveBeenCalled();
  });

  it("says the same thing when the trigger is the one that catches it", async () => {
    mount({
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:insert": {
        data: null,
        error: {
          code: "23514",
          message:
            "This listing is an example of what the catalogue will hold. No such property is available, so nothing can be arranged against it.",
        },
      },
    });

    const result = await requestInspection({ listingId: LISTING, when: when() });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("example listing");
  });

  it("still files a request against a real listing and opens its thread", async () => {
    const { writes } = mount({
      "listings:select": { data: { id: LISTING, is_demo: false }, error: null },
      "inspection_requests:insert": { data: { id: REQUEST }, error: null },
      "inspection_requests:update": { data: null, error: null },
    });

    const result = await requestInspection({ listingId: LISTING, when: when(), note: "Weekday evening." });

    expect(result).toEqual({ ok: true, data: { id: REQUEST } });
    expect(writes).toContain("inspection_requests:insert");
    expect(messages.startConversation).toHaveBeenCalledWith({ listingId: LISTING });
    expect(writes).toContain("inspection_requests:update");
  });
});
