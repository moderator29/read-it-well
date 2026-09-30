import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A2. The Send SMS hook's pieces, pure, so they can be tested without a
 * request: the Standard Webhooks signature check (the scheme Supabase signs
 * every auth hook with) against `SEND_SMS_HOOK_SECRET`, and the message.
 *
 * Its own secret and its own copy of the check, deliberately apart from the
 * Send Email hook's (`app/api/auth/email-hook`), so nothing about email
 * delivery changes because phone sign-in was added.
 */
export const SMS_HOOK_MAX_SKEW_SECONDS = 5 * 60;

export function smsHookSecret(env: Record<string, string | undefined> = process.env): Buffer[] {
  const raw = (env.SEND_SMS_HOOK_SECRET ?? "").trim();
  if (!raw) return [];
  /* `v1,whsec_new|v1,whsec_old` during a rotation. */
  return raw
    .split("|")
    .map((part) => part.trim())
    .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part))
    .map((part) => (part.startsWith("whsec_") ? part.slice("whsec_".length) : part))
    .filter((part) => part.length > 0)
    .map((part) => Buffer.from(part, "base64"));
}

function same(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function smsHookVerified(
  keys: readonly Buffer[],
  headers: { id: string; timestamp: string; signature: string },
  body: string,
  nowSeconds: number,
): boolean {
  if (keys.length === 0 || !headers.id || !headers.timestamp || !headers.signature) return false;
  const sentAt = Number(headers.timestamp);
  if (!Number.isFinite(sentAt) || Math.abs(nowSeconds - sentAt) > SMS_HOOK_MAX_SKEW_SECONDS) return false;
  const presented = headers.signature
    .split(" ")
    .map((part) => (part.startsWith("v1,") ? part.slice(3) : ""))
    .filter(Boolean);
  return keys.some((key) => {
    const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${body}`).digest("base64");
    return presented.some((candidate) => same(expected, candidate));
  });
}

/** The message: the code first, so a notification preview shows it; no link, ever. */
export function smsCodeMessage(otp: string): string {
  return `${otp} is your Vallo code. Never share it; Vallo will never ask you for it.`;
}

export function readSmsHookPayload(body: string): { phone: string; otp: string } | null {
  try {
    const parsed = JSON.parse(body) as { user?: { phone?: unknown }; sms?: { otp?: unknown } };
    const phone = typeof parsed.user?.phone === "string" ? parsed.user.phone : "";
    const otp = typeof parsed.sms?.otp === "string" ? parsed.sms.otp : "";
    if (!/^\d{6}$/.test(otp) || !/^\+?\d{8,15}$/.test(phone)) return null;
    return { phone: phone.startsWith("+") ? phone : `+${phone}`, otp };
  } catch {
    return null;
  }
}
