import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A locked session moves no money (docs/PASSCODE.md), and the check fails
 * closed: an error reading the state is a refusal.
 */
const s = vi.hoisted(() => ({ view: { kind: "open" } as unknown, userId: "user-1" as string | null, fail: false }));

vi.mock("./state", () => ({
  resolvePasscodeGate: async () => {
    if (s.fail) throw new Error("cookies() outside a request");
    return { view: s.view, userId: s.userId, unlock: null };
  },
}));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));

import { passcodeMoneyRefusal } from "./money";

beforeEach(() => {
  s.view = { kind: "unlocked", mint: false, length: 6 };
  s.userId = "user-1";
  s.fail = false;
});

describe("passcodeMoneyRefusal", () => {
  it("lets an unlocked session through", async () => {
    expect(await passcodeMoneyRefusal("user-1")).toBeNull();
  });

  it("lets a member with no passcode yet through (the setup screen stands in front)", async () => {
    s.view = { kind: "setup", mode: "first" };
    expect(await passcodeMoneyRefusal("user-1")).toBeNull();
  });

  it("refuses a locked session, a reset in progress and an unreadable passcode", async () => {
    for (const view of [
      { kind: "locked", mode: "code", length: 6, failedCount: 0, lockedUntil: null },
      { kind: "locked", mode: "unavailable", length: 6, failedCount: 0, lockedUntil: null },
      { kind: "setup", mode: "reset" },
    ]) {
      s.view = view;
      expect(await passcodeMoneyRefusal("user-1")).toMatch(/passcode/i);
    }
  });

  it("refuses when the session is somebody else's, or cannot be read", async () => {
    s.userId = "user-2";
    expect(await passcodeMoneyRefusal("user-1")).toMatch(/passcode/i);
    s.fail = true;
    expect(await passcodeMoneyRefusal("user-1")).toMatch(/passcode/i);
  });
});
