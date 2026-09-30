import { createHmac, timingSafeEqual } from "node:crypto";
import type { EmailChannel } from "./recipients";

/**
 * A12. THE SIGNED LINK BEHIND ONE-CLICK UNSUBSCRIBE AND THE PREFERENCES PAGE.
 *
 * Gmail and Yahoo require RFC 8058 one-click unsubscribe from bulk senders: a
 * `List-Unsubscribe` HTTPS address plus `List-Unsubscribe-Post:
 * List-Unsubscribe=One-Click`, which the mailbox provider POSTs with no
 * cookie. So the address has to carry its own authority, and this is it:
 *
 *     v1.<user id>.<channel>.<expires, unix seconds>.<HMAC-SHA256, base64url>
 *
 * The key is derived from the service role key for this one purpose (the
 * same pattern as the passcode cookies, `lib/passcode/unlock-cookie.ts`), so
 * there is no new secret to provision, and a token from one purpose can never
 * be replayed as another. Without the service key there is no token at all,
 * and the mail goes out with the old sign-in link instead of a fake one.
 *
 * WHAT A TOKEN CAN DO, and nothing more: turn the email channels on or off
 * for the one account it names. It cannot sign anybody in, read anything but
 * a masked address, or touch security mail, which carries no channel and so
 * never carries a token (`lib/notify/outbox.ts`).
 */

export const TOKEN_VERSION = "v1";
/** Long enough that an old newsletter's link still works; RFC 8058 asks for no short expiry. */
export const TOKEN_LIFETIME_SECONDS = 180 * 24 * 60 * 60;

export const EMAIL_CHANNELS: readonly EmailChannel[] = ["bookings", "messages", "wallet", "marketing"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEmailChannel(value: string): value is EmailChannel {
  return (EMAIL_CHANNELS as readonly string[]).includes(value);
}

export function unsubscribeKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (secret.length < 16) return null;
  return createHmac("sha256", secret).update("vallo.email.unsubscribe.v1").digest();
}

function mac(key: Buffer, body: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

export function signUnsubscribe(key: Buffer, userId: string, channel: EmailChannel, nowSeconds: number): string {
  const body = `${TOKEN_VERSION}.${userId}.${channel}.${nowSeconds + TOKEN_LIFETIME_SECONDS}`;
  return `${body}.${mac(key, body)}`;
}

export type UnsubscribeClaims = { userId: string; channel: EmailChannel; expiresAt: number };

export function readUnsubscribe(key: Buffer, token: string | null | undefined, nowSeconds: number): UnsubscribeClaims | null {
  if (!token || token.length > 300) return null;
  const parts = token.split(".");
  if (parts.length !== 5) return null;
  const [version = "", userId = "", channel = "", expiresRaw = "", signature = ""] = parts;
  if (version !== TOKEN_VERSION || !UUID.test(userId) || !isEmailChannel(channel) || !/^\d{1,12}$/.test(expiresRaw)) return null;
  const expected = Buffer.from(mac(key, `${version}.${userId}.${channel}.${expiresRaw}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const expiresAt = Number(expiresRaw);
  if (expiresAt <= nowSeconds) return null;
  return { userId, channel, expiresAt };
}

/** "a•••@gmail.com": enough to recognise your own address, not enough to learn someone's. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  const local = email.slice(0, at);
  return `${local[0]}•••${email.slice(at)}`;
}
