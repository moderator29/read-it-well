import { describe, expect, it } from "vitest";
import { asEntry, backoff, due, entryKey, makeEntry, OUTBOX_KINDS } from "./outbox";
import { INFLIGHT_MAX_AGE_MS, readInflight } from "./inflight";

const ID = "3653d202-e498-4db0-ab71-882649f7f446";

describe("the outbox (V-40)", () => {
  it("never carries money", () => {
    expect(OUTBOX_KINDS).toEqual(["save_listing", "save_place"]);
    expect(makeEntry("withdraw", ID, true, 0)).toBeNull();
    expect(makeEntry("send_money", ID, true, 0)).toBeNull();
  });
  it("keys an intent by what it is about, so a second tap replaces the first", () => {
    const first = makeEntry("save_listing", ID, true, 1)!;
    const second = makeEntry("save_listing", ID, false, 2)!;
    expect(first.key).toBe(second.key);
    expect(second.want).toBe(false);
    expect(entryKey("save_place", `accommodation:${ID}`)).toBe(`save_place:accommodation:${ID}`);
    expect(makeEntry("save_place", "hotel:x", true, 0)).toBeNull();
  });
  it("replays oldest first, only what is due, and backs off", () => {
    const a = { ...makeEntry("save_listing", "a", true, 10)!, nextAt: 10 };
    const b = { ...makeEntry("save_listing", "b", true, 5)!, nextAt: 5 };
    const later = { ...makeEntry("save_listing", "c", true, 1)!, nextAt: 1_000 };
    expect(due([a, b, later], 100).map((e) => e.target)).toEqual(["b", "a"]);
    expect([0, 1, 2, 3, 9].map(backoff)).toEqual([5_000, 15_000, 45_000, 120_000, 120_000]);
  });
  it("checks what it reads back", () => {
    expect(asEntry({ kind: "save_listing", target: ID, want: true, createdAt: 3 })).toMatchObject({ target: ID, createdAt: 3 });
    expect(asEntry({ kind: "save_listing", target: ID, want: "yes" })).toBeNull();
  });
});

describe("in-flight payment notes (V-40)", () => {
  it("keeps valid references for two days and drops anything else", () => {
    const now = 1_000_000_000_000;
    const raw = JSON.stringify([
      { reference: "rm-book-abc123", amountMinor: 500_000, at: now - 1000 },
      { reference: "rm-book-old", amountMinor: 1, at: now - INFLIGHT_MAX_AGE_MS - 1 },
      { reference: "<script>", at: now },
      "junk",
    ]);
    expect(readInflight(raw, now)).toEqual([{ reference: "rm-book-abc123", amountMinor: 500_000, at: now - 1000 }]);
    expect(readInflight("{", now)).toEqual([]);
    expect(readInflight(null, now)).toEqual([]);
  });
});
