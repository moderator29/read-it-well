import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The unlock's heartbeat (docs/PASSCODE.md): it slides a valid unlock,
 * keeping its issue time, mints one after a fresh sign-in, and writes
 * nothing for a locked session.
 */
const s = vi.hoisted(() => ({
  view: { kind: "open" } as unknown,
  unlock: null as null | { issuedAt: number },
  written: [] as (number | undefined)[],
}));

vi.mock("@/lib/passcode/state", () => ({
  resolvePasscodeGate: async () => ({ view: s.view, userId: (s.view as { kind: string }).kind === "open" ? null : "user-1", unlock: s.unlock }),
  writeUnlock: async (_userId: string, issuedAt?: number) => {
    s.written.push(issuedAt);
    return true;
  },
}));

import { POST } from "./route";

beforeEach(() => {
  s.written = [];
  s.unlock = null;
});

describe("POST /api/passcode/touch", () => {
  it("slides a valid unlock from its original issue time", async () => {
    s.view = { kind: "unlocked", mint: false, length: 6 };
    s.unlock = { issuedAt: 1_790_000_000 };
    const response = await POST();
    expect(await response.json()).toMatchObject({ state: "unlocked" });
    expect(s.written).toEqual([1_790_000_000]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("mints one after a fresh sign-in", async () => {
    s.view = { kind: "unlocked", mint: true, length: 6 };
    await POST();
    expect(s.written).toEqual([undefined]);
  });

  it("writes nothing for a locked session or a reset in progress", async () => {
    for (const view of [
      { kind: "locked", mode: "code", length: 6, failedCount: 0, lockedUntil: null },
      { kind: "setup", mode: "reset" },
    ]) {
      s.view = view;
      expect(await (await POST()).json()).toEqual({ state: "locked" });
    }
    expect(s.written).toEqual([]);
  });

  it("answers a signed-out caller with 401", async () => {
    s.view = { kind: "open" };
    expect((await POST()).status).toBe(401);
  });
});
