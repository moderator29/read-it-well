import { describe, expect, it } from "vitest";
import { isShareToken, readSafetyShare, shareableInspections, safetyControlRows } from "./safety";

describe("readSafetyShare", () => {
  it("reads a live page with the area and never more", () => {
    const view = readSafetyShare({
      state: "live",
      first_name: "Ada",
      area: "Ikoyi",
      city: "Lagos",
      agent_name: "Chidi Okeke",
      identity_checked_at: "2026-08-12T10:00:00Z",
      slot_at: "2026-09-24T13:00:00Z",
      expected_back_at: "2026-09-24T14:00:00Z",
      checked_in_at: null,
      overdue: false,
      address: "1 Secret Road",
    });
    expect(view.state).toBe("live");
    if (view.state !== "live") return;
    expect(view.area).toBe("Ikoyi");
    expect(JSON.stringify(view)).not.toContain("Secret");
    /* The lister's name is text they typed: never carried, even if sent. */
    expect(JSON.stringify(view)).not.toContain("Chidi");
  });

  it("never falls back to a city, and is failed on anything unreadable", () => {
    const view = readSafetyShare({ state: "live", area: " ", city: "Plot 5 Bourdillon Road" });
    expect(view.state === "live" && view.area).toBeNull();
    expect(readSafetyShare({ state: "cancelled" }).state).toBe("cancelled");
    expect(readSafetyShare({ state: "moved" }).state).toBe("moved");
  });

  it("keeps saying whether the renter checked in when the inspection is cancelled or moved", () => {
    expect(readSafetyShare({ state: "cancelled", overdue: true, checked_in_at: null })).toEqual({
      state: "cancelled",
      checkedIn: false,
      overdue: true,
      quiet: false,
    });
    expect(readSafetyShare({ state: "cancelled", quiet: true, overdue: false })).toMatchObject({ quiet: true });
    expect(readSafetyShare({ state: "moved", overdue: false, checked_in_at: "2026-09-24T10:00:00Z" })).toEqual({
      state: "moved",
      checkedIn: true,
      overdue: false,
      quiet: false,
    });
    expect(readSafetyShare({ state: "stopped" }).state).toBe("stopped");
    expect(readSafetyShare(null).state).toBe("failed");
    expect(readSafetyShare({ state: "something" }).state).toBe("failed");
    expect(readSafetyShare({ state: "unknown" }).state).toBe("unknown");
    expect(readSafetyShare({ state: "expired" }).state).toBe("expired");
  });
});

describe("isShareToken", () => {
  it("accepts the token alphabet only", () => {
    expect(isShareToken("abcdefghijklmnopqrstuvwxyz012345")).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken("abcdefghijklmnopqrst/../../etc")).toBe(false);
  });
});

describe("shareableInspections", () => {
  const now = Date.parse("2026-09-24T12:00:00Z");
  const row = (over: Partial<{ id: string; state: string; slotAt: string | null; side: "requester" | "lister" }>) => ({
    id: "a",
    state: "CONFIRMED",
    slotAt: "2026-09-24T15:00:00Z",
    side: "requester" as const,
    ...over,
  });

  it("offers the renter's own confirmed inspection until four hours after the slot", () => {
    expect(shareableInspections([row({})], now)).toHaveLength(1);
    expect(shareableInspections([row({ slotAt: "2026-09-24T09:00:00Z" })], now)).toHaveLength(1);
    expect(shareableInspections([row({ slotAt: "2026-09-24T07:00:00Z" })], now)).toHaveLength(0);
  });

  it("is not offered more than 24 hours ahead", () => {
    expect(shareableInspections([row({ slotAt: "2026-09-25T12:00:00Z" })], now)).toHaveLength(1);
    expect(shareableInspections([row({ slotAt: "2026-09-25T12:30:00Z" })], now)).toHaveLength(0);
  });

  it("never offers the lister's side, an unconfirmed one, or one with no time", () => {
    expect(shareableInspections([row({ side: "lister" })], now)).toHaveLength(0);
    expect(shareableInspections([row({ state: "REQUESTED" })], now)).toHaveLength(0);
    expect(shareableInspections([row({ slotAt: null })], now)).toHaveLength(0);
  });
});

describe("which inspections carry the safety control", () => {
  const now = Date.parse("2026-09-24T12:00:00Z");
  const row = (id: string, state: string, slotAt: string | null, side: "requester" | "lister" = "requester") => ({ id, state, slotAt, side });

  it("keeps the control while a share is live, whatever the inspection's state", () => {
    const rows = [row("w", "WITHDRAWN", "2026-09-24T09:00:00Z"), row("c", "COMPLETED", "2026-09-24T09:00:00Z")];
    const out = safetyControlRows(rows, {
      w: { checkedIn: false, expiresAt: "2026-09-24T13:00:00Z" },
      c: { checkedIn: true, expiresAt: "2026-09-24T13:00:00Z" },
    }, now);
    expect(out.map((item) => [item.row.id, item.initial])).toEqual([["w", "shared"], ["c", "done"]]);
  });

  it("uses the share's own expiry, not the slot", () => {
    const rows = [row("late", "CONFIRMED", "2026-09-24T05:00:00Z")];
    expect(safetyControlRows(rows, { late: { checkedIn: false, expiresAt: "2026-09-24T12:30:00Z" } }, now)).toHaveLength(1);
    expect(safetyControlRows(rows, { late: { checkedIn: false, expiresAt: "2026-09-24T11:59:00Z" } }, now)).toHaveLength(0);
  });

  it("offers a new link only on a confirmed inspection in the window, and never to the lister", () => {
    const rows = [
      row("soon", "CONFIRMED", "2026-09-24T15:00:00Z"),
      row("far", "CONFIRMED", "2026-09-27T15:00:00Z"),
      row("theirs", "CONFIRMED", "2026-09-24T15:00:00Z", "lister"),
      row("gone", "WITHDRAWN", "2026-09-24T15:00:00Z"),
    ];
    expect(safetyControlRows(rows, {}, now).map((item) => [item.row.id, item.initial])).toEqual([["soon", "none"]]);
  });
});
