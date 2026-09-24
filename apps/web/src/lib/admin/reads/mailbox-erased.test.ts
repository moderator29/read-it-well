import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-10: the one reader of an erased account's keyed hash. The comparison is
 * the database's (`admin_erased_identity_matches`); this proves the screen's
 * read asks it and says "unavailable" rather than "no matches" on a failure.
 */
const seam = vi.hoisted(() => ({
  calls: [] as string[],
  answer: { data: null as unknown, error: null as unknown },
}));

vi.mock("server-only", () => ({}));
vi.mock("./shared", async (original) => ({
  ...(await original<typeof import("./shared")>()),
  adminReader: async () => ({
    rpc: async (name: string) => {
      seam.calls.push(name);
      return seam.answer;
    },
  }),
}));

const { readErasedMatches } = await import("./mailbox");

describe("readErasedMatches", () => {
  beforeEach(() => {
    seam.calls = [];
    seam.answer = { data: null, error: null };
  });

  it("asks the database to compare live mailboxes with erased ones", async () => {
    seam.answer = {
      data: [{ user_id: "live", erased_user_id: "gone", canonical_rule: "gmail" }],
      error: null,
    };
    const read = await readErasedMatches();
    expect(seam.calls).toEqual(["admin_erased_identity_matches"]);
    expect(read).toEqual({ state: "ok", data: [{ userId: "live", erasedUserId: "gone", rule: "gmail" }] });
  });

  it("a refusal or a failure is unavailable, never an empty list", async () => {
    seam.answer = { data: null, error: { code: "42501" } };
    expect(await readErasedMatches()).toEqual({ state: "unavailable" });
  });
});
