import { describe, expect, it } from "vitest";
import {
  ADMIN_WORKSPACE_KEY,
  DEFAULT_MODE,
  isMode,
  normaliseMode,
  workspaceKey,
} from "./mode.constants";

describe("the mode cookie contract", () => {
  it("defaults to personal, so nobody is put into a workspace by silence", () => {
    expect(DEFAULT_MODE).toBe("personal");
    expect(normaliseMode(undefined)).toBe("personal");
    expect(normaliseMode(null)).toBe("personal");
    expect(normaliseMode("nonsense")).toBe("personal");
  });

  /*
   * THE LEGACY VALUE. `agent` was a role's name on an axis that is not about
   * roles. It keeps being read for one release so that no signed in person is
   * thrown back to personal mode by a deploy.
   */
  it("still reads the old agent value and means working by it", () => {
    expect(isMode("agent")).toBe(true);
    expect(normaliseMode("agent")).toBe("working");
  });

  it("reads the new value", () => {
    expect(isMode("working")).toBe(true);
    expect(normaliseMode("working")).toBe("working");
  });

  it("keeps the two questions apart: what was written, and what it means now", () => {
    /* `isMode` widens to accept the legacy value; `normaliseMode` never
       returns it. Widening the first must not quietly widen the second. */
    expect(isMode("agent")).toBe(true);
    expect(normaliseMode("agent")).not.toBe("agent");
  });
});

describe("the workspace key", () => {
  it("spells each kind the one way", () => {
    expect(workspaceKey("supply", "abc")).toBe("supply:abc");
    expect(workspaceKey("firm", "abc")).toBe("firm:abc");
    expect(workspaceKey("stays", "abc")).toBe("stays:abc");
    expect(ADMIN_WORKSPACE_KEY).toBe("admin");
  });
});
