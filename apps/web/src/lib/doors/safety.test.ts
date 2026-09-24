import { describe, expect, it } from "vitest";
import { isShareToken, readSafetyShare, shareableInspections } from "./safety";

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
    });
    expect(readSafetyShare({ state: "moved", overdue: false, checked_in_at: "2026-09-24T10:00:00Z" })).toEqual({
      state: "moved",
      checkedIn: true,
      overdue: false,
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
