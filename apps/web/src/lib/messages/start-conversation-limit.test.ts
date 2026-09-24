import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-P2-02: the conversations trigger refuses a guest's 21st new listing
 * thread in a day with SQLSTATE 54000, even when the app's limiter has failed
 * open. The guest is told it is the daily limit, not "try again".
 */
const ME = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
const LISTER = "e0000000-0000-4000-8000-000000000001";
const LISTING = "ed000000-0000-4000-8000-000000000003";

const insertError = vi.hoisted(() => ({ value: null as null | { code: string } }));

function client() {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      let op = "select";
      for (const m of ["select", "eq", "or", "limit"]) chain[m] = () => chain;
      chain["insert"] = () => {
        op = "insert";
        return chain;
      };
      chain["maybeSingle"] = async () => {
        if (table === "listings") return { data: { id: LISTING, title: "t", agent_id: "a1", agents: { user_id: LISTER } }, error: null };
        return { data: null, error: null };
      };
      chain["single"] = async () =>
        op === "insert" && insertError.value ? { data: null, error: insertError.value } : { data: { id: "c1" }, error: null };
      return chain;
    },
  };
}

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "nc",
  SIGNED_OUT_MESSAGE: "so",
  resolveSession: async () => ({ state: "signed-in", user: { id: ME }, supabase: client() }),
}));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../security/rate-limit", () => ({
  consume: async () => ({ allowed: true, degraded: true, retryIn: "" }),
  subjectForUser: (id: string) => `user:${id}`,
}));
vi.mock("./blocks", () => ({
  BLOCKED_MESSAGE: "b",
  BLOCKED_THREAD_MESSAGE: "bt",
  blockedBetween: async () => false,
  guardConversation: async () => null,
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client() }));

const { startConversation } = await import("./actions");

beforeEach(() => {
  insertError.value = null;
});

describe("opening a listing thread", () => {
  it("opens one when the database accepts it (control)", async () => {
    expect(await startConversation({ listingId: LISTING })).toEqual({ ok: true, data: { conversationId: "c1" } });
  });

  it("names the daily limit when the database refuses with 54000, the limiter having failed open", async () => {
    insertError.value = { code: "54000" };
    const result = await startConversation({ listingId: LISTING });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("daily limit");
      expect(result.error).toContain("tomorrow");
    }
  });
});
