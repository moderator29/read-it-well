import { describe, expect, it } from "vitest";
import { looksCheckable, readCheckQuery, readCheckResult } from "./agent-check";

describe("what a person pasted into /check", () => {
  it.each([
    ["0803 123 4567", { kind: "phone", value: "+2348031234567" }],
    ["+234 803 123 4567", { kind: "phone", value: "+2348031234567" }],
    ["2348031234567", { kind: "phone", value: "+2348031234567" }],
    ["va-7k3mp", { kind: "code", value: "VA-7K3MP" }],
    ["VA7K3MP", { kind: "code", value: "VA-7K3MP" }],
  ])("reads %j", (raw, expected) => {
    expect(readCheckQuery(raw)).toEqual(expected);
  });

  it.each(["", "hello", "VA-BBBBB", "VL-7F49SZ", "0123", "08031234567890", "VA-7K3M"])("refuses %j", (raw) => {
    expect(readCheckQuery(raw)).toBeNull();
  });

  it("tells search which queries are worth a check link", () => {
    expect(looksCheckable("0803 123 4567")).toBe(true);
    expect(looksCheckable("Lekki")).toBe(false);
    expect(looksCheckable(undefined)).toBe(false);
  });
});

describe("what the lookup answered", () => {
  const phone = { kind: "phone" as const, value: "+2348031234567" };

  it("reads a yes with the facts it carries and nothing else", () => {
    const result = readCheckResult(
      { found: true, display_name: "Chidi Okeke", role: "agent", code: "VA-7K3MP", identity_checked_at: "2026-08-12T10:00:00Z", handle: "chidi" },
      phone,
    );
    expect(result).toEqual({
      found: true,
      kind: "phone",
      displayName: "Chidi Okeke",
      role: "agent",
      code: "VA-7K3MP",
      identityCheckedAt: "2026-08-12T10:00:00Z",
      handle: "chidi",
    });
  });

  it("reads the one plain no, and refuses anything it cannot read", () => {
    expect(readCheckResult({ found: false, kind: "phone" }, phone)).toEqual({ found: false, kind: "phone" });
    expect(readCheckResult({}, phone)).toBeNull();
    expect(readCheckResult(null, phone)).toBeNull();
  });
});
