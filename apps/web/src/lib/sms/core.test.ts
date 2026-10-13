import { describe, expect, it } from "vitest";

import { capturingTransport, unconfiguredTransport, type CapturedMessage } from "../phone-otp/transport";
import { SMS_MAX_CHARS, sendNotificationSms, smsBody, type SmsDeps } from "./core";

const noon = () => new Date("2026-10-06T11:00:00Z");
const midnight = () => new Date("2026-10-06T23:00:00Z");

function deps(over: Partial<SmsDeps> = {}, outbox: CapturedMessage[] = []): SmsDeps {
  return {
    transport: capturingTransport(outbox),
    confirmedPhone: async () => "+2348031234567",
    settings: async () => ({}),
    now: noon,
    ...over,
  };
}

describe("notification SMS", () => {
  it("sends a permitted moment to the confirmed phone over the transport", async () => {
    const outbox: CapturedMessage[] = [];
    const out = await sendNotificationSms(deps({}, outbox), { userId: "u", event: "payment_taken", text: "  Paid  N5,000. " });
    expect(out).toEqual({ sent: true });
    expect(outbox).toEqual([{ to: "+2348031234567", message: "Paid N5,000." }]);
  });

  it("refuses events the policy does not permit, and members who switched SMS off", async () => {
    const outbox: CapturedMessage[] = [];
    expect(await sendNotificationSms(deps({}, outbox), { userId: "u", event: "message_received", text: "hi" })).toEqual({
      sent: false,
      reason: "not_permitted",
    });
    const off = deps({ settings: async () => ({ notifications: { sms: false } }) }, outbox);
    expect((await sendNotificationSms(off, { userId: "u", event: "payout_settled", text: "x" })).sent).toBe(false);
    expect((await sendNotificationSms(off, { userId: "u", event: "security_new_device", text: "x" })).sent).toBe(true);
    expect(outbox).toHaveLength(1);
  });

  it("holds non-security SMS in quiet hours, never security", async () => {
    expect(await sendNotificationSms(deps({ now: midnight }), { userId: "u", event: "payment_failed", text: "x" })).toEqual({
      sent: false,
      reason: "quiet_hours",
    });
    expect((await sendNotificationSms(deps({ now: midnight }), { userId: "u", event: "security_credential_reset", text: "x" })).sent).toBe(true);
  });

  it("never sends without a confirmed phone, and says when no vendor is wired", async () => {
    expect(await sendNotificationSms(deps({ confirmedPhone: async () => null }), { userId: "u", event: "payment_taken", text: "x" })).toEqual({
      sent: false,
      reason: "no_phone",
    });
    expect(
      await sendNotificationSms(deps({ transport: unconfiguredTransport }), { userId: "u", event: "payment_taken", text: "x" }),
    ).toEqual({ sent: false, reason: "transport_unconfigured" });
  });

  it("keeps a message to two segments", () => {
    expect(smsBody("a".repeat(1000))).toHaveLength(SMS_MAX_CHARS);
  });
});
