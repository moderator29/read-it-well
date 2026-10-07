import { describe, expect, it } from "vitest";

import {
  CHANNEL_POLICY,
  SMS_MOMENTS,
  decideSms,
  inQuietHours,
  readSmsPreference,
  type EventPolicy,
} from "./channel-policy";

const noonLagos = new Date("2026-10-06T11:00:00Z");
const midnightLagos = new Date("2026-10-06T23:00:00Z");
const on = readSmsPreference({});

describe("channel policy: one table", () => {
  it("SMS only on the six moments and on security, each with its class", () => {
    const smsEvents = Object.entries(CHANNEL_POLICY as Record<string, EventPolicy>).filter(([, p]) =>
      p.channels.includes("sms"),
    );
    for (const [name, p] of smsEvents) {
      expect(p.sms, name).toBeDefined();
      if (p.sms !== "security") expect(SMS_MOMENTS as readonly string[], name).toContain(name);
    }
    expect(smsEvents.filter(([, p]) => p.sms !== "security").map(([n]) => n).sort()).toEqual([...SMS_MOMENTS].sort());
    for (const p of Object.values(CHANNEL_POLICY as Record<string, EventPolicy>)) {
      if (!p.channels.includes("sms")) expect(p.sms).toBeUndefined();
    }
  });

  it("no social or rewards event is ever an SMS", () => {
    expect(decideSms("message_received", on, noonLagos)).toBe("not_permitted");
    expect(decideSms("rewards_referral_qualified", on, noonLagos)).toBe("not_permitted");
    expect(decideSms("not_an_event", on, noonLagos)).toBe("not_permitted");
  });

  it("a member can switch non-security SMS off; security ignores it and quiet hours", () => {
    const off = readSmsPreference({ notifications: { sms: false } });
    expect(decideSms("payment_taken", off, noonLagos)).toBe("member_off");
    expect(decideSms("security_new_device", off, midnightLagos)).toBe("send");
    expect(decideSms("payment_taken", on, noonLagos)).toBe("send");
    expect(decideSms("payment_taken", on, midnightLagos)).toBe("quiet_hours");
  });

  it("quiet hours read in Lagos time, across midnight and within a day", () => {
    expect(inQuietHours(on, new Date("2026-10-06T20:00:00Z"))).toBe(true); // 21:00 Lagos
    expect(inQuietHours(on, new Date("2026-10-06T05:59:00Z"))).toBe(true); // 06:59
    expect(inQuietHours(on, new Date("2026-10-06T06:00:00Z"))).toBe(false); // 07:00
    const day = readSmsPreference({ notifications: { smsQuietStart: 13, smsQuietEnd: 15 } });
    expect(inQuietHours(day, new Date("2026-10-06T12:30:00Z"))).toBe(true);
    expect(inQuietHours(day, new Date("2026-10-06T15:00:00Z"))).toBe(false);
  });

  it("a malformed preference falls back to the defaults", () => {
    expect(readSmsPreference({ notifications: { sms: "no", smsQuietStart: 99 } })).toEqual({
      sms: true,
      quietStart: 21,
      quietEnd: 7,
    });
  });
});
