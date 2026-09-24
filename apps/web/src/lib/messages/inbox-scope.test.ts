import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-02: an admin's own inbox is their own conversations.
 *
 * RLS lets an admin read every conversation, so a read that trusts RLS alone
 * listed every member's private threads in the admin's inbox, and "Mark all
 * read" then marked other people's messages read with the service role. Both
 * reads now name the caller as a party: guest_id or agent_id.
 */

vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
const flags = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));
const admin = vi.hoisted(() => ({ createAdminClient: vi.fn() }));

vi.mock("../actions/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../actions/session")>()),
  resolveSession: session.resolveSession,
}));
vi.mock("../flags", () => flags);
vi.mock("../supabase/admin", () => admin);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { loadConversationSummaries } = await import("./live");
const { markInboxRead } = await import("./actions");

const ME = "11111111-1111-4111-8111-111111111111";

/** Records every filter applied to a `conversations` read. */
function recordingClient(filters: string[]) {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      const passthrough = ["select", "order", "limit", "in", "neq", "is", "eq"];
      for (const m of passthrough) chain[m] = () => chain;
      chain.or = (expr: string) => {
        if (table === "conversations") filters.push(expr);
        return chain;
      };
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return chain;
    },
  };
}

describe("the inbox reads only the caller's own conversations (SEC-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flags.isFeatureEnabled.mockResolvedValue(true);
  });

  it("loadConversationSummaries names the caller as guest or agent", async () => {
    const filters: string[] = [];
    await loadConversationSummaries(recordingClient(filters) as never, { id: ME } as never);
    expect(filters).toEqual([`guest_id.eq.${ME},agent_id.eq.${ME}`]);
  });

  it("markInboxRead reads only the caller's conversations before it marks anything", async () => {
    const filters: string[] = [];
    session.resolveSession.mockResolvedValue({
      state: "signed-in",
      user: { id: ME },
      supabase: recordingClient(filters),
    });
    await markInboxRead();
    expect(filters).toEqual([`guest_id.eq.${ME},agent_id.eq.${ME}`]);
  });
});
