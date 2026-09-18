import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A block has to hold in BOTH directions and has to hold when the service
 * role is missing, because that is the deployment state in which every other
 * safety check has already been found quietly off.
 */

let adminRows: { user_id: string; other_id: string }[] | null = [];
let adminThrows = false;
let ownRows: { user_id: string; other_id: string }[] = [];
let conversation: { guest_id: string; agent_id: string } | null = null;

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => {
    if (adminThrows) throw new Error("no service role");
    const q = {
      select: () => q,
      or: () => q,
      limit: async () => ({ data: adminRows, error: adminRows === null ? { message: "down" } : null }),
    };
    return { from: () => q };
  },
}));

function ownClient() {
  const blocks = {
    select: () => blocks,
    eq: () => blocks,
    limit: async () => ({ data: ownRows, error: null }),
  };
  const conversations = {
    select: () => conversations,
    eq: () => conversations,
    maybeSingle: async () => ({ data: conversation, error: null }),
  };
  return {
    from: (table: string) => (table === "blocks" ? blocks : conversations),
  } as never;
}

import { BLOCKED_MESSAGE, blockedBetween, blockedInRows, guardConversation } from "./blocks";

/* Rule 1, checked as a codepoint so this file carries no dash itself. */
const EM_DASH = String.fromCharCode(0x2014);

describe("blockedInRows", () => {
  it("holds in either direction", () => {
    expect(blockedInRows([{ user_id: "a", other_id: "b" }], "a", "b")).toBe(true);
    expect(blockedInRows([{ user_id: "a", other_id: "b" }], "b", "a")).toBe(true);
    expect(blockedInRows([{ user_id: "a", other_id: "c" }], "a", "b")).toBe(false);
    expect(blockedInRows([], "a", "b")).toBe(false);
  });
});

describe("blockedBetween", () => {
  beforeEach(() => {
    adminRows = [];
    adminThrows = false;
    ownRows = [];
  });

  it("sees the other side's block through the service role", async () => {
    adminRows = [{ user_id: "them", other_id: "me" }];
    expect(await blockedBetween(ownClient(), "me", "them")).toBe(true);
  });

  it("falls back to the caller's own half without the service role", async () => {
    adminThrows = true;
    ownRows = [{ user_id: "me", other_id: "them" }];
    expect(await blockedBetween(ownClient(), "me", "them")).toBe(true);
    ownRows = [];
    expect(await blockedBetween(ownClient(), "me", "them")).toBe(false);
  });

  it("never blocks a person from themselves and never throws", async () => {
    expect(await blockedBetween(ownClient(), "me", "me")).toBe(false);
    adminRows = null;
    expect(await blockedBetween(ownClient(), "me", "them")).toBe(false);
  });
});

describe("guardConversation", () => {
  beforeEach(() => {
    adminRows = [];
    adminThrows = false;
    conversation = { guest_id: "me", agent_id: "them" };
  });

  it("names the other party when the thread is open", async () => {
    expect(await guardConversation(ownClient(), "me", "c1")).toEqual({ ok: true, otherId: "them" });
    expect(await guardConversation(ownClient(), "them", "c1")).toEqual({ ok: true, otherId: "me" });
  });

  it("refuses across a block, either way round", async () => {
    adminRows = [{ user_id: "them", other_id: "me" }];
    expect(await guardConversation(ownClient(), "me", "c1")).toEqual({ ok: false, reason: "blocked" });
    expect(await guardConversation(ownClient(), "them", "c1")).toEqual({ ok: false, reason: "blocked" });
  });

  it("answers a thread the caller is not in as not theirs", async () => {
    conversation = null;
    expect(await guardConversation(ownClient(), "me", "c1")).toEqual({ ok: false, reason: "not_yours" });
  });

  it("carries honest copy with no em dash", () => {
    expect(BLOCKED_MESSAGE).toContain("either direction");
    expect(BLOCKED_MESSAGE).not.toContain(EM_DASH);
  });
});
