import { describe, expect, it } from "vitest";
import { loadUnreadCounts, unreadFromRows } from "./unread";

describe("unread counts from my_unread_counts()", () => {
  it("sums per conversation and in total, past the old 400-message ceiling", () => {
    const counts = unreadFromRows([
      { conversation_id: "a", unread: 450 },
      { conversation_id: "b", unread: 2 },
    ]);
    expect(counts.total).toBe(452);
    expect(counts.byConversation.get("a")).toBe(450);
    expect(counts.byConversation.get("b")).toBe(2);
    expect(counts.asAgent).toBe(0);
  });

  it("sums the agent side on as_agent, with no conversation id list", () => {
    const counts = unreadFromRows([
      { conversation_id: "a", unread: 5, as_agent: true },
      { conversation_id: "b", unread: 2, as_agent: false },
      { conversation_id: "c", unread: 1, as_agent: true },
    ]);
    expect(counts.asAgent).toBe(6);
    expect(counts.total).toBe(8);
  });

  it("skips malformed and non-positive rows instead of counting them", () => {
    const counts = unreadFromRows([
      { conversation_id: null, unread: 3 },
      { conversation_id: "a", unread: "x" },
      { conversation_id: "b", unread: 0 },
      { conversation_id: "c", unread: "4" },
    ]);
    expect(counts.total).toBe(4);
    expect([...counts.byConversation.keys()]).toEqual(["c"]);
    expect(unreadFromRows(null).total).toBe(0);
  });

  it("returns null when the read fails, so no caller shows a false zero", async () => {
    const failing = { rpc: async () => ({ data: null, error: { message: "boom" } }) };
    expect(await loadUnreadCounts(failing as never)).toBeNull();
    const ok = { rpc: async (name: string) => ({ data: name === "my_unread_counts" ? [{ conversation_id: "a", unread: 1 }] : null, error: null }) };
    expect((await loadUnreadCounts(ok as never))?.total).toBe(1);
  });
});
