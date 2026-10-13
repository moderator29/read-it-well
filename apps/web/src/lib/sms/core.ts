import { decideSms, readSmsPreference, type SmsDecision } from "../notify/channel-policy";
import type { OtpTransport } from "../phone-otp/transport";

/**
 * NOTIFICATION SMS OVER THE EXISTING TERMII TRANSPORT (D22). No I/O of its
 * own: the transport and the two reads are injected, so it is unit tested.
 *
 * Only to a CONFIRMED phone (`confirmed_phones`), never to a number typed on a
 * booking form. Only what the channel policy permits. Short: one SMS segment
 * where possible, never more than two, and never a code or a link with a
 * token in it (a lock screen is readable by whoever holds the phone).
 */

export const SMS_MAX_CHARS = 306;

export type SmsDeps = {
  transport: OtpTransport;
  confirmedPhone(userId: string): Promise<string | null>;
  settings(userId: string): Promise<unknown>;
  now?: () => Date;
};

export type SmsOutcome =
  | { sent: true }
  | { sent: false; reason: SmsDecision | "no_phone" | "empty" | "transport_unconfigured" | "transport_failed" | "read_failed" };

export function smsBody(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= SMS_MAX_CHARS ? flat : `${flat.slice(0, SMS_MAX_CHARS - 1).trimEnd()}…`;
}

export async function sendNotificationSms(
  deps: SmsDeps,
  input: { userId: string; event: string; text: string },
): Promise<SmsOutcome> {
  const body = smsBody(input.text);
  if (!body) return { sent: false, reason: "empty" };
  let phone: string | null;
  let settings: unknown;
  try {
    [phone, settings] = await Promise.all([deps.confirmedPhone(input.userId), deps.settings(input.userId)]);
  } catch {
    return { sent: false, reason: "read_failed" };
  }
  const decision = decideSms(input.event, readSmsPreference(settings), (deps.now ?? (() => new Date()))());
  if (decision !== "send") return { sent: false, reason: decision };
  if (!phone) return { sent: false, reason: "no_phone" };
  const result = await deps.transport.send(phone, body);
  if (result.ok) return { sent: true };
  return { sent: false, reason: result.reason === "unconfigured" ? "transport_unconfigured" : "transport_failed" };
}
