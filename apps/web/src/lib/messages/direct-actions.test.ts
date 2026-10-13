import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The first direct message, when the database refuses a new chat because the
 * person asks first and the sender does not follow them (`direct:follow_first`,
 * pending migration start_direct_conversation_contact_policy): the sender is
 * told to follow, in the same words as the app's own check, never told they
 * were blocked or that something broke.
 */
const seam = vi.hoisted(() => ({
  rpc: vi.fn(),
  send: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("./blocks", () => ({ BLOCKED_THREAD_MESSAGE: "BLOCKED", blockedBetween: async () => false }));
vi.mock("./actions", () => ({ sendMessage: seam.send }));
vi.mock("./direct", () => ({
  readDirectTarget: async () => ({
    state: "ready",
    viewerId: "11111111-1111-4111-8111-111111111111",
    conversationId: null,
    target: { userId: "22222222-2222-4222-8222-222222222222", handle: "ada", displayLabel: "Ada Eze", avatarUrl: "", isAgent: false },
  }),
}));
vi.mock("../actions/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../actions/session")>()),
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "11111111-1111-4111-8111-111111111111" },
    supabase: { rpc: seam.rpc },
  }),
}));

const { sendDirectMessage } = await import("./direct-actions");

describe("a new chat the database refuses", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says to follow the person when the database holds the ask-first rule", async () => {
    seam.rpc.mockResolvedValue({ data: null, error: { code: "P0001", message: "direct:follow_first" } });
    const result = await sendDirectMessage({ handle: "ada", body: "Hello" });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toBe(
      "Follow Ada Eze to message them. They take new messages only from people who follow them.",
    );
    expect(seam.send).not.toHaveBeenCalled();
  });

  it("still reads a block as a block", async () => {
    seam.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "direct:blocked" } });
    const result = await sendDirectMessage({ handle: "ada", body: "Hello" });
    expect(result.ok ? "" : result.error).toBe("BLOCKED");
  });

  it("sends into the chat the database opened", async () => {
    seam.rpc.mockResolvedValue({ data: "33333333-3333-4333-8333-333333333333", error: null });
    seam.send.mockResolvedValue({ ok: true, data: null });
    const result = await sendDirectMessage({ handle: "ada", body: "Hello" });
    expect(result.ok).toBe(true);
    expect(seam.send).toHaveBeenCalledWith({ conversationId: "33333333-3333-4333-8333-333333333333", body: "Hello" });
  });
});
