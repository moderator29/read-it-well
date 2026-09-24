import { describe, expect, it } from "vitest";
import { groupKey, groupSessions, type GroupableSession } from "./session-groups";

const chromeAndroid = { kind: "device", browser: "Chrome", platform: "Android" } as const;
const safariIos = { kind: "device", browser: "Safari", platform: "iOS" } as const;
const server = { kind: "server", browser: null, platform: null } as const;
const unrecognised = { kind: "unrecognised", browser: null, platform: null } as const;

function s(
  id: string,
  device: GroupableSession["device"],
  signedInAt: string,
  lastSeenAt: string,
  isCurrent = false,
): GroupableSession {
  return { id, device, signedInAt, lastSeenAt, isCurrent };
}

describe("groupKey", () => {
  it("folds named devices by browser and platform only", () => {
    expect(groupKey(chromeAndroid)).toBe("device:Chrome:Android");
    expect(groupKey({ kind: "device", browser: "Chrome", platform: null })).toBe("device:Chrome:-");
  });
  it("folds every nameless kind under its kind", () => {
    expect(groupKey(server)).toBe("server");
    expect(groupKey(unrecognised)).toBe("unrecognised");
  });
});

describe("groupSessions", () => {
  it("folds 89 unrecorded sessions into one line and keeps the stranger on its own", () => {
    const rows: GroupableSession[] = [];
    for (let i = 0; i < 89; i += 1) {
      rows.push(s(`n${i}`, server, "2026-09-23T20:00:00Z", `2026-09-23T20:${String(i % 60).padStart(2, "0")}:00Z`));
    }
    rows.push(s("stranger", unrecognised, "2026-09-23T21:05:00Z", "2026-09-23T21:10:00Z"));
    rows.push(s("me", chromeAndroid, "2026-09-20T08:00:00Z", "2026-09-23T21:11:00Z", true));

    const out = groupSessions(rows);
    expect(out.current?.id).toBe("me");
    expect(out.groups).toHaveLength(2);
    /* The most recently used group is first: the stranger, not the pile. */
    expect(out.groups[0]?.key).toBe("unrecognised");
    expect(out.groups[1]?.sessions).toHaveLength(89);
  });

  it("never folds the current session into a group, even when its type matches", () => {
    const out = groupSessions([
      s("me", chromeAndroid, "2026-09-20T08:00:00Z", "2026-09-23T10:00:00Z", true),
      s("other", chromeAndroid, "2026-09-21T08:00:00Z", "2026-09-22T10:00:00Z"),
    ]);
    expect(out.current?.id).toBe("me");
    expect(out.groups).toHaveLength(1);
    expect(out.groups[0]?.sessions.map((x) => x.id)).toEqual(["other"]);
  });

  it("reports the earliest sign-in and the latest use across the group", () => {
    const out = groupSessions([
      s("a", safariIos, "2026-09-10T08:00:00Z", "2026-09-11T08:00:00Z"),
      s("b", safariIos, "2026-09-05T08:00:00Z", "2026-09-22T08:00:00Z"),
      s("c", safariIos, "2026-09-12T08:00:00Z", "2026-09-12T09:00:00Z"),
    ]);
    const group = out.groups[0];
    expect(group?.firstSignedInAt).toBe("2026-09-05T08:00:00Z");
    expect(group?.lastSeenAt).toBe("2026-09-22T08:00:00Z");
    expect(group?.sessions.map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("answers an empty list with no current session and no groups", () => {
    expect(groupSessions([])).toEqual({ current: null, groups: [] });
  });

  it("does not let an unparseable time reorder the list above a real one", () => {
    const out = groupSessions([
      s("bad", server, "nonsense", "nonsense"),
      s("good", chromeAndroid, "2026-09-22T08:00:00Z", "2026-09-22T09:00:00Z"),
    ]);
    expect(out.groups[0]?.key).toBe("device:Chrome:Android");
  });
});
