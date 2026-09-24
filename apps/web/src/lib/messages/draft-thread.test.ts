import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * UX-P2-03: opening "Message" writes nothing. The page looks for an existing
 * thread; the first message creates the thread and posts itself; the daily
 * new-conversation count is spent only when a thread is really made; an
 * empty listing thread is not shown in either inbox.
 */
const ME = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
const LISTER = "e0000000-0000-4000-8000-000000000001";
const LISTING = "ed000000-0000-4000-8000-000000000003";

const log = vi.hoisted(() => ({ inserts: [] as string[], consumed: 0, existing: null as null | string }));

function client() {
  return {
    from(table: string) {
      const chain: Record<string, unknown> = {};
      let op = "select";
      for (const m of ["select", "eq", "or", "limit"]) chain[m] = () => chain;
      chain["insert"] = () => {
        op = "insert";
        log.inserts.push(table);
        return chain;
      };
      chain["maybeSingle"] = async () => {
        if (table === "listings") return { data: { id: LISTING, title: "t", agent_id: "a1", agents: { user_id: LISTER } }, error: null };
        if (table === "conversations") return { data: log.existing ? { id: log.existing } : null, error: null };
        return { data: null, error: null };
      };
      chain["single"] = async () =>
        op === "insert" && table === "messages"
          ? { data: { id: "m1", conversation_id: "c1000000-0000-4000-8000-000000000001", body: "hi", created_at: "2026-09-24T00:00:00Z" }, error: null }
          : { data: { id: "c1000000-0000-4000-8000-000000000001" }, error: null };
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
  consume: async () => {
    log.consumed += 1;
    return { allowed: true, degraded: false, retryIn: "" };
  },
  subjectForUser: (id: string) => `user:${id}`,
}));
vi.mock("./blocks", () => ({
  BLOCKED_MESSAGE: "b",
  BLOCKED_THREAD_MESSAGE: "bt",
  blockedBetween: async () => false,
  guardConversation: async () => ({ ok: true }),
}));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client() }));

const { findConversationForListing, startConversationWithMessage } = await import("./actions");

beforeEach(() => {
  log.inserts = [];
  log.consumed = 0;
  log.existing = null;
});

describe("the Message page does not write", () => {
  it("finds nothing and creates nothing when there is no thread", async () => {
    const result = await findConversationForListing({ listingId: LISTING });
    expect(result).toEqual({ ok: true, data: { conversationId: null } });
    expect(log.inserts).toEqual([]);
    expect(log.consumed).toBe(0);
  });

  it("returns an existing thread without writing", async () => {
    log.existing = "c9";
    expect(await findConversationForListing({ listingId: LISTING })).toEqual({
      ok: true,
      data: { conversationId: "c9" },
    });
    expect(log.inserts).toEqual([]);
  });

  it("makes the thread with the first message, once", async () => {
    const result = await startConversationWithMessage({ listingId: LISTING, body: "Is it still available?" });
    expect(result).toEqual({ ok: true, data: { conversationId: "c1000000-0000-4000-8000-000000000001" } });
    expect(log.inserts).toEqual(["conversations", "messages"]);
    expect(log.consumed).toBe(1);
  });

  it("refuses an empty first message before anything is written", async () => {
    const result = await startConversationWithMessage({ listingId: LISTING, body: "   " });
    expect(result.ok).toBe(false);
    expect(log.inserts).toEqual([]);
  });
});

describe("the page and the inbox", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

  it("the page looks rather than starts", () => {
    const page = src("app/(app)/messages/new/page.tsx");
    expect(page).toContain("findConversationForListing({ listingId: listing })");
    expect(page).not.toMatch(/\bstartConversation\(/);
    expect(page).toContain("<FirstMessage");
  });

  it("an empty listing thread is not listed", () => {
    const live = src("lib/messages/live.ts");
    expect(live).toContain("const shown = conversations.filter(");
    expect(live).toContain("return shown.map((c) => {");
  });
});
