import { describe, expect, it } from "vitest";
import { tapDestination } from "./push-taps";

describe("tapDestination (V-53)", () => {
  it("opens the notification's own path on a plain tap", () => {
    expect(tapDestination({ actionId: "tap", notification: { data: { href: "/messages/a" } } })).toBe("/messages/a");
  });
  it("opens the button's path when a button was pressed, FCM string form", () => {
    const data = { href: "/notifications", actions: JSON.stringify([{ id: "reply", title: "Reply", href: "/messages/b" }]) };
    expect(tapDestination({ actionId: "reply", notification: { data } })).toBe("/messages/b");
  });
  it("reads the APNs array form too", () => {
    const data = { href: "/x", actions: [{ id: "answer", href: "/agent/inspections" }] };
    expect(tapDestination({ actionId: "answer", notification: { data } })).toBe("/agent/inspections");
  });
  it("never leaves the origin, and falls back to the notifications list", () => {
    expect(tapDestination({ notification: { data: { href: "https://evil.example" } } })).toBe("/notifications");
    expect(tapDestination({ notification: { data: { href: "//evil.example" } } })).toBe("/notifications");
    expect(tapDestination({})).toBe("/notifications");
    const data = { href: "/ok", actions: "not json" };
    expect(tapDestination({ actionId: "reply", notification: { data } })).toBe("/ok");
  });
});
