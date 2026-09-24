import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";
import { groupSessions } from "./session-groups";
import type { DeviceSession } from "./sessions";

const PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";

function session(id: string, agent: string | null, isCurrent = false, lastSeenAt = "2026-09-23T10:00:00Z"): DeviceSession {
  return { id, isCurrent, signedInAt: "2026-09-20T10:00:00Z", lastSeenAt, device: describeDevice(agent) };
}

describe("the devices screen folds sessions it cannot describe", () => {
  it("lists real devices and counts the unrecorded ones on one line (V-19: 92 'Device not recorded' cards)", () => {
    const sessions = [
      session("a", PHONE),
      ...Array.from({ length: 92 }, (_, i) => session(`n${i}`, "node", false, `2026-09-2${i % 3}T10:00:00Z`)),
      session("c", "curl/8.5.0"),
    ];
    const groups = groupSessions(sessions);
    expect(groups.listed.map((s) => s.id)).toEqual(["a", "c"]);
    expect(groups.unrecorded.count).toBe(92);
    expect(groups.unrecorded.newestLastSeenAt).toBe("2026-09-22T10:00:00Z");
  });

  it("always lists the current session, even when its device was not recorded", () => {
    const groups = groupSessions([session("me", "node", true), session("old", null)]);
    expect(groups.listed.map((s) => s.id)).toEqual(["me"]);
    expect(groups.unrecorded.count).toBe(1);
  });

  it("folds nothing when every device is known", () => {
    const groups = groupSessions([session("a", PHONE, true)]);
    expect(groups.unrecorded).toEqual({ count: 0, newestLastSeenAt: null });
  });
});
