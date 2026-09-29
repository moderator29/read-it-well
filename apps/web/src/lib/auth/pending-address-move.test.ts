import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../supabase/server", () => ({ createClient: async () => ({}) }));

import { addressMoveHoldUntil } from "./pending-address-move";

/**
 * Tipping-off (SCUML item 6): the settings page describes ONLY the hold support
 * placed when it moved the member's address. A compliance hold (reason
 * `plain`) or any other reason reads as no hold at all.
 */
describe("addressMoveHoldUntil", () => {
  const now = Date.parse("2026-09-29T12:00:00Z");
  const later = "2026-10-03T12:00:00Z";
  it("shows the address-move hold while it runs", () => {
    expect(addressMoveHoldUntil({ hold_until: later, reason: "email address moved by support (request 1)" }, now)).toBe(later);
  });
  it("never shows a compliance hold or any other reason", () => {
    expect(addressMoveHoldUntil({ hold_until: later, reason: "plain" }, now)).toBeNull();
    expect(addressMoveHoldUntil({ hold_until: later, reason: "not me" }, now)).toBeNull();
    expect(addressMoveHoldUntil({ hold_until: later, reason: null }, now)).toBeNull();
    expect(addressMoveHoldUntil({ hold_until: later }, now)).toBeNull();
  });
  it("shows nothing once it has ended, or with no row", () => {
    expect(addressMoveHoldUntil({ hold_until: "2026-09-28T12:00:00Z", reason: "email address moved by support" }, now)).toBeNull();
    expect(addressMoveHoldUntil(null, now)).toBeNull();
  });
});
