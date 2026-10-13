import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/u/<handle>/message` and the first send follow the profile's own rule
 * (`message-door.ts`, founder 11 October 2026): a person who asks first takes
 * a new chat only from somebody who follows them; a chat that already exists
 * always opens. The client is a stand-in that answers the three reads this
 * makes: the profile, an existing direct chat, and the follow.
 */

vi.mock("server-only", () => ({}));
vi.mock("../supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("../supabase/admin", () => ({ createAdminClient: vi.fn() }));
const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
vi.mock("../actions/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../actions/session")>()),
  resolveSession: session.resolveSession,
}));

const { readDirectTarget } = await import("./direct");

const ME = "11111111-1111-4111-8111-111111111111";
const ADA = "22222222-2222-4222-8222-222222222222";

function client(opts: { policy: "OPEN" | "REQUEST"; follows: boolean; existing: string | null }) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "or", "limit", "in"]) chain[m] = () => chain;
      chain.maybeSingle = async () => {
        if (table === "social_profiles") {
          return {
            data: { user_id: ADA, handle: "ada", display_label: "Ada Eze", avatar_path: null, is_agent: false, contact_policy: opts.policy },
            error: null,
          };
        }
        if (table === "conversations") return { data: opts.existing ? { id: opts.existing } : null, error: null };
        return { data: null, error: null };
      };
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: table === "follows" && opts.follows ? [{ followee_id: ADA }] : [], error: null }).then(resolve);
      return chain;
    },
  };
}

const signIn = (opts: Parameters<typeof client>[0]) =>
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: ME }, supabase: client(opts) });

describe("who may open a new chat from a profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks a viewer who does not follow a person who asks first to follow them", async () => {
    signIn({ policy: "REQUEST", follows: false, existing: null });
    const read = await readDirectTarget("ada");
    expect(read.state).toBe("follow-first");
  });

  it("opens the chat for a viewer who follows them", async () => {
    signIn({ policy: "REQUEST", follows: true, existing: null });
    expect((await readDirectTarget("ada")).state).toBe("ready");
  });

  it("opens the chat for anybody when the person is open to anyone", async () => {
    signIn({ policy: "OPEN", follows: false, existing: null });
    expect((await readDirectTarget("ada")).state).toBe("ready");
  });

  it("always opens a chat that already exists", async () => {
    signIn({ policy: "REQUEST", follows: false, existing: "33333333-3333-4333-8333-333333333333" });
    const read = await readDirectTarget("ada");
    expect(read.state).toBe("ready");
    expect(read.state === "ready" ? read.conversationId : null).toBe("33333333-3333-4333-8333-333333333333");
  });
});
