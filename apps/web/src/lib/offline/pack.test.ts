import { describe, expect, it } from "vitest";
import { asCheckin, asPack, buildPack, checkinKey, isExpired, livePacks, readHandshake } from "./pack";

const ID = "3653d202-e498-4db0-ab71-882649f7f446";
const SEED = "0123456789abcdef0123456789abcdef01234567";
const NOW = Date.parse("2026-09-26T08:00:00Z");

const USER = "11111111-2222-4333-8444-555555555555";
const ok = {
  status: "ok",
  viewer: USER,
  area: "Yaba",
  state: "LA",
  role: "checker",
  seed: SEED,
  slot_at: "2026-09-26T10:00:00Z",
  expires_at: "2026-09-27T10:00:00Z",
  shown_by_name: "Tunde Bakare",
  principal_name: "Chidi Okeke",
  is_delegate: true,
  can_name_delegate: false,
};

describe("readHandshake", () => {
  it("reads a good answer", () => {
    const answer = readHandshake(ID, ok);
    expect(answer.state).toBe("ok");
    if (answer.state !== "ok") return;
    expect(answer.pack.role).toBe("checker");
    expect(answer.pack.isDelegate).toBe(true);
  });
  it("passes the three refusals through as themselves", () => {
    expect(readHandshake(ID, { status: "not_ready" })).toEqual({ state: "not_ready" });
    expect(readHandshake(ID, { status: "expired" })).toEqual({ state: "expired" });
    expect(readHandshake(ID, { status: "not_found" })).toEqual({ state: "not_found" });
  });
  it("reads an invitation to show one, with no seed", () => {
    expect(readHandshake(ID, { status: "invite", principal_name: "Chidi Okeke", slot_at: "2026-09-26T10:00:00Z", area: "Yaba", state: "LA" })).toEqual({
      state: "invite",
      principalName: "Chidi Okeke",
      slotAt: "2026-09-26T10:00:00Z",
      place: "Yaba, LA",
    });
  });
  it("fails without the account it was issued to", () => {
    expect(readHandshake(ID, { ...ok, viewer: undefined }).state).toBe("failed");
  });
  it("fails on a malformed seed, role or date, and on nonsense", () => {
    expect(readHandshake(ID, { ...ok, seed: "xyz" }).state).toBe("failed");
    expect(readHandshake(ID, { ...ok, role: "admin" }).state).toBe("failed");
    expect(readHandshake(ID, { ...ok, slot_at: "soon" }).state).toBe("failed");
    expect(readHandshake("not-a-uuid", ok).state).toBe("failed");
    expect(readHandshake(ID, null).state).toBe("failed");
  });
});

describe("the pack", () => {
  const answer = readHandshake(ID, ok);
  if (answer.state !== "ok") throw new Error("fixture");
  const pack = buildPack(answer.pack, NOW);

  it("round-trips through storage", () => {
    expect(asPack(JSON.parse(JSON.stringify(pack)))).toEqual(pack);
  });
  it("carries the area and state, and no title or address field of any kind", () => {
    expect(pack.place).toBe("Yaba, LA");
    const keys = Object.keys(pack);
    for (const banned of ["title", "listingTitle", "address", "street", "lat", "lng", "latitude", "longitude", "landmark"]) {
      expect(keys).not.toContain(banned);
    }
  });
  it("expires at the database's moment and not before", () => {
    expect(isExpired(pack, Date.parse("2026-09-27T09:59:59Z"))).toBe(false);
    expect(isExpired(pack, Date.parse("2026-09-27T10:00:00Z"))).toBe(true);
  });
  it("refuses a tampered or older-version record", () => {
    expect(asPack({ ...pack, version: 0 })).toBeNull();
    expect(asPack({ ...pack, seed: "00" })).toBeNull();
    expect(asPack("pack")).toBeNull();
  });
  it("lists live packs soonest first and drops the expired", () => {
    const later = { ...pack, inspectionId: "3653d202-e498-4db0-ab71-882649f7f447", slotAt: "2026-09-26T15:00:00Z" };
    const gone = { ...pack, inspectionId: "3653d202-e498-4db0-ab71-882649f7f448", expiresAt: "2026-09-25T00:00:00Z" };
    expect(livePacks([later, gone, pack, null], NOW, USER).map((p) => p.inspectionId)).toEqual([
      pack.inspectionId,
      later.inspectionId,
    ]);
  });
  it("shows nobody another account's packs, and nothing with no owner", () => {
    const theirs = { ...pack, userId: "99999999-2222-4333-8444-555555555555" };
    expect(livePacks([pack, theirs], NOW, USER).map((p) => p.userId)).toEqual([USER]);
    expect(livePacks([pack], NOW, null)).toEqual([]);
  });
});

describe("queued check-ins", () => {
  it("validates and keys them so a double tap is one row", () => {
    const checkin = { inspectionId: ID, result: "match", observedAt: "2026-09-26T10:01:00Z" };
    expect(asCheckin(checkin)).toEqual(checkin);
    expect(checkinKey(asCheckin(checkin)!)).toBe(`${ID}:match:2026-09-26T10:01:00Z`);
    expect(asCheckin({ ...checkin, result: "maybe" })).toBeNull();
  });
});
