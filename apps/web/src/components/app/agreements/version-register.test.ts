import { describe, expect, it } from "vitest";
import { previousVersionDiff, versionIndex, versionRegister, type RecordEvent, type StoredVersion } from "./version-register";

/**
 * M2: the agreement's versions are drawn from what the record holds and
 * nothing else: B9's kept snapshots for the terms, the sided events for who
 * did what on which version, and the agreement row for where the current
 * version stands.
 */

const ev = (action: string, at: string, side: RecordEvent["side"], version: number | null): RecordEvent => ({
  at,
  action,
  note: null,
  side,
  version,
});

const v = (version: number, rent: number, total: number, extra: Record<string, unknown> = {}): StoredVersion => ({
  version,
  terms: { rent_minor: rent, move_in: "2026-11-01", ...extra },
  amountMinor: total,
});

describe("previousVersionDiff: only from the two kept snapshots", () => {
  it("has nothing to compare on a first version", () => {
    expect(previousVersionDiff({ current: 1, versions: [v(1, 100, 100)] })).toEqual({ state: "first" });
  });

  it("compares the current version with the one before, line by line, and the total", () => {
    const diff = previousVersionDiff({ current: 3, versions: [v(2, 100_00, 150_00), v(3, 120_00, 170_00)] });
    expect(diff.state).toBe("ready");
    if (diff.state !== "ready") return;
    expect(diff.from).toBe(2);
    expect(diff.to).toBe(3);
    expect(diff.changes.map((c) => [c.key, c.before, c.after])).toEqual([
      ["rent_minor", 100_00, 120_00],
      ["total", 150_00, 170_00],
    ]);
  });

  it("never compares against an older version than the one before", () => {
    /* Version 2 was never kept: version 1 is not a stand-in for it. */
    expect(previousVersionDiff({ current: 3, versions: [v(1, 90_00, 90_00), v(3, 120_00, 120_00)] })).toEqual({
      state: "unkept",
      previous: 2,
    });
  });

  it("says the change cannot be shown when the current snapshot itself is missing", () => {
    expect(previousVersionDiff({ current: 2, versions: [v(1, 90_00, 90_00)] })).toEqual({ state: "unkept", previous: 1 });
  });

  it("reports a version that moved with no visible change as an empty list, not as nothing", () => {
    const diff = previousVersionDiff({ current: 2, versions: [v(1, 90_00, 90_00), v(2, 90_00, 90_00)] });
    expect(diff).toEqual({ state: "ready", from: 1, to: 2, changes: [] });
  });
});

describe("versionRegister: confirmations are bound to the version they name", () => {
  const events: RecordEvent[] = [
    ev("opened", "2026-10-01T09:00:00Z", "renter", 1),
    ev("confirmed", "2026-10-01T10:00:00Z", "renter", 1),
    ev("confirmed", "2026-10-01T11:00:00Z", "owner", 1),
    ev("amended", "2026-10-02T09:00:00Z", "owner", 2),
    ev("confirmed", "2026-10-02T12:00:00Z", "owner", 2),
  ];

  it("lists every version newest first, the current one marked, with how each was made", () => {
    const entries = versionRegister({ current: 2, stored: [1, 2], events, confirmedNow: { renter: false, owner: true } });
    expect(entries.map((e) => [e.version, e.current, e.kept])).toEqual([
      [2, true, true],
      [1, false, true],
    ]);
    expect(entries[0]!.made).toEqual({ kind: "changed", by: "owner", at: "2026-10-02T09:00:00Z" });
    expect(entries[1]!.made).toEqual({ kind: "drawn", at: "2026-10-01T09:00:00Z" });
  });

  it("never draws a confirmation of version 1 against version 2", () => {
    const [current, first] = versionRegister({ current: 2, stored: [1, 2], events, confirmedNow: { renter: false, owner: true } });
    expect(current!.confirmed).toEqual({ renter: null, owner: "2026-10-02T12:00:00Z" });
    expect(first!.confirmed).toEqual({ renter: "2026-10-01T10:00:00Z", owner: "2026-10-01T11:00:00Z" });
  });

  it("lets the agreement row outrank the event log on the current version", () => {
    /* An event says the owner confirmed version 2, but the row no longer
       honours it: it is not drawn as standing. */
    const [current] = versionRegister({ current: 2, stored: [2], events, confirmedNow: { renter: false, owner: false } });
    expect(current!.confirmed.owner).toBeNull();
    expect(current!.confirmedUndated.owner).toBe(false);
  });

  it("says a standing confirmation the log cannot date is undated rather than inventing a date", () => {
    const [current] = versionRegister({ current: 2, stored: [2], events, confirmedNow: { renter: true, owner: true } });
    expect(current!.confirmed.renter).toBeNull();
    expect(current!.confirmedUndated.renter).toBe(true);
  });

  it("marks versions made before every version was kept as not kept, and dates nothing it does not hold", () => {
    const entries = versionRegister({ current: 3, stored: [3], events: [], confirmedNow: { renter: false, owner: false } });
    expect(entries.map((e) => e.kept)).toEqual([true, false, false]);
    expect(entries[0]!.made).toBeNull();
    expect(entries[2]!.made).toEqual({ kind: "drawn", at: null });
  });

  it("returns nothing for a version number the record cannot hold", () => {
    expect(versionRegister({ current: 0, stored: [], events: [], confirmedNow: { renter: false, owner: false } })).toEqual([]);
  });
});

describe("versionIndex: the register row's version line", () => {
  it("is the highest kept version and the count of earlier ones", () => {
    expect(versionIndex([3, 1, 2])).toEqual({ current: 3, earlierKept: 2 });
    expect(versionIndex([4])).toEqual({ current: 4, earlierKept: 0 });
  });

  it("is absent when nothing is kept for this reader", () => {
    expect(versionIndex([])).toBeNull();
  });
});
