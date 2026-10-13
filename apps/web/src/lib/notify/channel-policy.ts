/**
 * THE CHANNEL POLICY (D22, Session 2 handoff 7.15c, R2-09). ONE TABLE.
 *
 * Every event declares its channels here and nowhere else, so preferences,
 * quiet hours and SMS cost control are applied once.
 *
 * SMS IS RATIONED. It is permitted for exactly six moments that matter
 * (R2-09: payment taken, payment failed, booking confirmed, inspection
 * scheduled, agreement ready, payout settled), each in one of D22's classes
 * (money that moved or failed to move, a deadline with consequences), plus
 * SECURITY. Never social, never marketing, never anything that can wait. A
 * member can switch non-security SMS off; SECURITY IGNORES THE PREFERENCE and
 * quiet hours, and settings must say so plainly.
 *
 * A test pins that SMS appears on no event outside those classes.
 */

export type Channel = "in_app" | "push" | "email" | "sms";
export type SmsClass = "money" | "deadline" | "security";

export type EventPolicy = {
  channels: readonly Channel[];
  /** Required when `channels` includes "sms"; forbidden otherwise. */
  sms?: SmsClass;
};

export const CHANNEL_POLICY = {
  /* ---- the six SMS moments (R2-09) ---- */
  payment_taken: { channels: ["in_app", "push", "email", "sms"], sms: "money" },
  payment_failed: { channels: ["in_app", "push", "email", "sms"], sms: "money" },
  booking_confirmed: { channels: ["in_app", "push", "email", "sms"], sms: "deadline" },
  inspection_scheduled: { channels: ["in_app", "push", "email", "sms"], sms: "deadline" },
  agreement_ready: { channels: ["in_app", "push", "email", "sms"], sms: "deadline" },
  payout_settled: { channels: ["in_app", "push", "email", "sms"], sms: "money" },

  /* ---- security: SMS regardless of preference ---- */
  security_new_device: { channels: ["in_app", "push", "email", "sms"], sms: "security" },
  security_payout_account_changed: { channels: ["in_app", "push", "email", "sms"], sms: "security" },
  security_credential_reset: { channels: ["in_app", "email", "sms"], sms: "security" },

  /* ---- no SMS: these can wait for the app ---- */
  rewards_referral_qualified: { channels: ["in_app", "push"] },
  rewards_referral_reversed: { channels: ["in_app", "email"] },
  rewards_payout_failed: { channels: ["in_app", "push", "email"] },
  message_received: { channels: ["in_app", "push"] },
  saved_price_drop: { channels: ["in_app", "push", "email"] },
} as const satisfies Record<string, EventPolicy>;

export type NotifyEvent = keyof typeof CHANNEL_POLICY;

/** The six non-security SMS moments, by name. */
export const SMS_MOMENTS = [
  "payment_taken",
  "payment_failed",
  "booking_confirmed",
  "inspection_scheduled",
  "agreement_ready",
  "payout_settled",
] as const satisfies readonly NotifyEvent[];

export function policyFor(event: string): EventPolicy | null {
  return Object.prototype.hasOwnProperty.call(CHANNEL_POLICY, event)
    ? (CHANNEL_POLICY as Record<string, EventPolicy>)[event]!
    : null;
}

export function isSecurityEvent(event: string): boolean {
  return policyFor(event)?.sms === "security";
}

/** What a member has said about SMS. Read from profiles.settings.notifications. */
export type SmsPreference = {
  /** Non-security SMS on. Default true. */
  sms: boolean;
  /** Quiet hours in Lagos time, start and end hour (0 to 23). Default 21 to 7. */
  quietStart: number;
  quietEnd: number;
};

export const DEFAULT_SMS_PREFERENCE: SmsPreference = { sms: true, quietStart: 21, quietEnd: 7 };

export function readSmsPreference(settings: unknown): SmsPreference {
  const n =
    settings && typeof settings === "object" ? (settings as Record<string, unknown>).notifications : undefined;
  const o = n && typeof n === "object" ? (n as Record<string, unknown>) : {};
  const hour = (v: unknown, d: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23 ? v : d);
  return {
    sms: o.sms === false ? false : true,
    quietStart: hour(o.smsQuietStart, DEFAULT_SMS_PREFERENCE.quietStart),
    quietEnd: hour(o.smsQuietEnd, DEFAULT_SMS_PREFERENCE.quietEnd),
  };
}

/** The hour in Lagos (UTC+1, no daylight saving). */
export function lagosHour(at: Date): number {
  return (at.getUTCHours() + 1) % 24;
}

export function inQuietHours(pref: SmsPreference, at: Date): boolean {
  const h = lagosHour(at);
  if (pref.quietStart === pref.quietEnd) return false;
  return pref.quietStart < pref.quietEnd
    ? h >= pref.quietStart && h < pref.quietEnd
    : h >= pref.quietStart || h < pref.quietEnd;
}

export type SmsDecision = "send" | "not_permitted" | "member_off" | "quiet_hours";

/**
 * Whether this event may go by SMS to this member now. Security always sends.
 * `quiet_hours` means hold it until the window ends, never drop it silently.
 */
export function decideSms(event: string, pref: SmsPreference, at: Date): SmsDecision {
  const p = policyFor(event);
  if (!p || !p.channels.includes("sms") || !p.sms) return "not_permitted";
  if (p.sms === "security") return "send";
  if (!pref.sms) return "member_off";
  if (inQuietHours(pref, at)) return "quiet_hours";
  return "send";
}
