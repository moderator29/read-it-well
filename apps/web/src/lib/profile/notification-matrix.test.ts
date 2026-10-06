import { describe, expect, it } from "vitest";
import { wantsPush } from "@/lib/push/preferences";
import { readQuietHours } from "@/lib/push/quiet-hours";
import { mergeSettings, parseSettings, settingsPatchSchema } from "./schema";

/**
 * R3-14: WHAT THE MATRIX WRITES IS WHAT DELIVERY READS.
 *
 * The push column and quiet hours are written through `updateSettings`'s
 * merge into `profiles.settings.notifications`, and read by the push policy's
 * own readers. These tests join the two ends, so a renamed key on either side
 * fails here rather than silently sending (or silencing) somebody's pushes.
 */
describe("the notification matrix's writes, read by the push policy", () => {
  it("a push switch for one topic is read by wantsPush and leaves the email switch alone", () => {
    const merged = mergeSettings({ notifications: { messages: true } }, { notifications: { channels: { messages: { push: false } } } });
    expect(wantsPush(merged, "message")).toBe(false);
    expect(merged.notifications.messages).toBe(true);
  });

  it("one topic's push switch never wipes another's", () => {
    const first = mergeSettings({}, { notifications: { channels: { bookings: { push: false } } } });
    const second = mergeSettings(first, { notifications: { channels: { wallet: { push: false } } } });
    expect(wantsPush(second, "booking")).toBe(false);
    expect(wantsPush(second, "wallet")).toBe(false);
  });

  it("quiet hours round-trip through the stored document to the policy's reader", () => {
    const merged = mergeSettings({}, { notifications: { quiet_hours: { enabled: true, from: "23:00", to: "06:30", timezone: "Africa/Lagos" } } });
    expect(readQuietHours(parseSettings(merged))).toEqual({ enabled: true, from: "23:00", to: "06:30", timezone: "Africa/Lagos" });
    /* A later patch about something else keeps the window. */
    const later = mergeSettings(merged, { notifications: { marketing: true } });
    expect(readQuietHours(later).enabled).toBe(true);
  });

  it("refuses a clock that is not a clock", () => {
    expect(settingsPatchSchema.safeParse({ notifications: { quiet_hours: { enabled: true, from: "25:00", to: "07:00", timezone: "Africa/Lagos" } } }).success).toBe(false);
  });

  it("drops a malformed stored window rather than failing the page", () => {
    expect(parseSettings({ notifications: { quiet_hours: { enabled: "yes" } } }).notifications.quiet_hours).toBeUndefined();
  });
});
