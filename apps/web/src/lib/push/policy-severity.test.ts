import { describe, expect, it } from "vitest";
import { decide, isSavedPriceDrop, wantsSavedPriceDrops, type QueuedNotification } from "./policy";

const now = new Date("2026-09-30T12:00:00Z");

function queued(over: Partial<QueuedNotification>): QueuedNotification {
  return {
    queueId: "q",
    userId: "u",
    kind: "social",
    title: "Somebody liked your post",
    body: null,
    href: "/post/1",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 3_600_000),
    ...over,
  };
}

describe("push by severity (B11) and saved price drops (B13)", () => {
  it("sends an fyi silent, and an action with sound", () => {
    const fyi = decide({ notification: queued({}), settings: {}, now });
    expect(fyi.action === "send" && fyi.payload.quiet).toBe(true);
    const action = decide({
      notification: queued({ kind: "message", title: "New message", href: "/messages/a" }),
      settings: {},
      now,
    });
    expect(action.action === "send" && action.payload.quiet).toBe(false);
  });

  it("pushes a saved price drop unless the member turned it off", () => {
    const n = queued({ kind: "listing", title: "Price down on a place you saved", href: "/listing/abc?change=price-down" });
    expect(decide({ notification: n, settings: {}, now }).action).toBe("send");
    expect(
      decide({ notification: n, settings: { notifications: { savedPriceDrops: false } }, now }).action,
    ).toBe("suppress");
  });

  it("reads the switch and the address strictly", () => {
    expect(wantsSavedPriceDrops(null)).toBe(true);
    expect(wantsSavedPriceDrops({ notifications: { savedPriceDrops: false } })).toBe(false);
    expect(isSavedPriceDrop("/listing/a?change=price-down")).toBe(true);
    expect(isSavedPriceDrop("/listing/a?change=price-up")).toBe(false);
    expect(isSavedPriceDrop("/post/a?change=price-down")).toBe(false);
  });
});
