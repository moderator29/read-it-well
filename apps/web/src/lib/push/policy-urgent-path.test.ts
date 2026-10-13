import { describe, expect, it } from "vitest";
import { decide, isUrgentPath, type QueuedNotification } from "./policy";

/* V-19: a new sign-in wakes the phone through quiet hours; nothing else
   written as `system` does. */

const QUIET = { notifications: { quiet_hours: { enabled: true, from: "22:00", to: "07:00", timezone: "Africa/Lagos" } } };
/* 22:30Z is 23:30 in Lagos, inside the window. */
const NIGHT = new Date("2026-03-01T22:30:00Z");

function note(href: string | null): QueuedNotification {
  return {
    queueId: "q1",
    userId: "u1",
    kind: "system",
    title: "New sign-in to Vallo",
    body: "Chrome on Android signed in to your account.",
    href,
    createdAt: new Date("2026-03-01T22:29:00Z"),
    expiresAt: new Date("2026-03-02T22:29:00Z"),
  };
}

describe("isUrgentPath", () => {
  it("is urgent for the new sign-in alert, with or without its query", () => {
    expect(isUrgentPath("/settings/devices/alert")).toBe(true);
    expect(isUrgentPath("/settings/devices/alert?d=abc123")).toBe(true);
  });
  it("is not urgent for its neighbours or for a prefix look-alike", () => {
    expect(isUrgentPath("/settings/devices")).toBe(false);
    expect(isUrgentPath("/settings/devices/alerts-and-more")).toBe(false);
    expect(isUrgentPath(null)).toBe(false);
  });
  it("is not fooled by an off-origin link carrying the path", () => {
    expect(isUrgentPath("https://evil.example/settings/devices/alert")).toBe(false);
    expect(isUrgentPath("//evil.example/settings/devices/alert")).toBe(false);
  });
});

describe("decide, for a new sign-in during quiet hours", () => {
  it("sends it now, marked urgent", () => {
    const verdict = decide({ notification: note("/settings/devices/alert?d=abc123"), settings: QUIET, now: NIGHT });
    expect(verdict.action).toBe("send");
    if (verdict.action !== "send") throw new Error("unreachable");
    expect(verdict.payload.urgent).toBe(true);
  });
  it("still holds an ordinary system notice until morning", () => {
    const verdict = decide({ notification: note("/notifications"), settings: QUIET, now: NIGHT });
    expect(verdict.action).toBe("hold");
  });
});

describe("decide, for an incoming call during quiet hours (the founder, 8 October 2026)", () => {
  const conv = "11111111-2222-4333-8444-555555555555";
  const call = "66666666-7777-4888-8999-aaaaaaaaaaaa";
  it("rings through: the member thread, the agent side and a review invitation", () => {
    for (const href of [`/messages/${conv}?call=${call}`, `/agent/messages/${conv}?call=${call}`, `/calls/reviews/${conv}?call=${call}`]) {
      expect(isUrgentPath(href), href).toBe(true);
      const verdict = decide({ notification: note(href), settings: QUIET, now: NIGHT });
      expect(verdict.action, href).toBe("send");
    }
  });
  it("still holds the missed-call notice and an ordinary message until morning", () => {
    for (const href of [`/messages/${conv}`, `/agent/messages/${conv}`, `/messages/${conv}?call=not-a-call`]) {
      expect(isUrgentPath(href), href).toBe(false);
    }
  });
});
