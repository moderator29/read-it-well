import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { UNLOCK_IDLE_SECONDS, UNLOCK_MAX_SECONDS } from "./rules";

/**
 * THE UNLOCKED STATE, AS A SIGNED COOKIE.
 *
 * After a right passcode (or a new one, or a full sign-in in the last five
 * minutes) the server writes `vallo_unlock`: httpOnly, SameSite=Lax, no
 * Max-Age (so it ends with the browser session), and carrying its own expiry
 * because a browser that restores its session cookies must not restore an
 * unlock with them.
 *
 *   v1.<user id>.<issued at, s>.<expires at, s>.<HMAC-SHA256, base64url>
 *
 * It SLIDES: every touch re-signs it with `expires = now + 15 minutes`, up to
 * 12 hours after it was first issued, after which the passcode is asked again
 * whatever the member is doing. It is TIED TO THE USER ID: a cookie minted
 * for one account unlocks nothing for another signed in on the same browser.
 *
 * THE KEY. There is no general cookie secret on this platform, and the one
 * server-only secret every deployment already has is the service role key.
 * The HMAC key is derived from it under a purpose label rather than being the
 * key itself, so the cookie can never be used to recover it and no other
 * purpose shares it. Rotating the service key simply asks everyone for their
 * passcode again. No key (a development machine without the service key)
 * means no unlock can be minted: the gate then falls back to a fresh
 * password sign-in, never to skipping the lock.
 */

export const UNLOCK_COOKIE = "vallo_unlock";
/** "Use your password instead" was chosen: after the next full sign-in, set a new code. */
export const RESET_INTENT_COOKIE = "vallo_passcode_reset";
export const RESET_INTENT_SECONDS = 30 * 60;

const VERSION = "v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deriveKey(secret: string, purpose: string): Buffer {
  return createHmac("sha256", secret).update(`vallo.passcode.${purpose}.v1`).digest();
}

/** The HMAC key for `purpose`, or null when this server has no secret to derive it from. */
export function passcodeKey(purpose: "unlock" | "reset", env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const secret = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (secret.length < 16) return null;
  return deriveKey(secret, purpose);
}

function mac(key: Buffer, body: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

function sameMac(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type UnlockClaims = { userId: string; issuedAt: number; expiresAt: number };

/** Sign an unlock for `userId` at `nowSeconds`, keeping `issuedAt` when it slides. */
export function signUnlock(key: Buffer, userId: string, nowSeconds: number, issuedAt: number = nowSeconds): string {
  const cap = issuedAt + UNLOCK_MAX_SECONDS;
  const expiresAt = Math.min(nowSeconds + UNLOCK_IDLE_SECONDS, cap);
  const body = `${VERSION}.${userId}.${issuedAt}.${expiresAt}`;
  return `${body}.${mac(key, body)}`;
}

/**
 * The claims in a valid, unexpired unlock for exactly this user, or null.
 * Anything malformed, forged, expired, too old or for someone else is null.
 */
export function readUnlock(key: Buffer, value: string | undefined | null, userId: string, nowSeconds: number): UnlockClaims | null {
  if (!value || value.length > 256) return null;
  const parts = value.split(".");
  if (parts.length !== 5) return null;
  const [version = "", id = "", issuedRaw = "", expiresRaw = "", signature = ""] = parts;
  if (version !== VERSION || !UUID.test(id) || id.toLowerCase() !== userId.toLowerCase()) return null;
  if (!/^\d{1,12}$/.test(issuedRaw) || !/^\d{1,12}$/.test(expiresRaw)) return null;
  const body = `${version}.${id}.${issuedRaw}.${expiresRaw}`;
  if (!sameMac(signature, mac(key, body))) return null;
  const issuedAt = Number(issuedRaw);
  const expiresAt = Number(expiresRaw);
  if (expiresAt <= nowSeconds) return null;
  if (issuedAt > nowSeconds + 60) return null;
  if (nowSeconds - issuedAt > UNLOCK_MAX_SECONDS) return null;
  if (expiresAt - issuedAt > UNLOCK_MAX_SECONDS) return null;
  return { userId: id, issuedAt, expiresAt };
}

/** The "set a new code after signing in" marker, bound to the user and signed. */
export function signResetIntent(key: Buffer, userId: string, nowSeconds: number): string {
  const body = `${VERSION}.${userId}.${nowSeconds + RESET_INTENT_SECONDS}`;
  return `${body}.${mac(key, body)}`;
}

export function readResetIntent(key: Buffer, value: string | undefined | null, userId: string, nowSeconds: number): boolean {
  if (!value || value.length > 200) return false;
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const [version = "", id = "", expiresRaw = "", signature = ""] = parts;
  if (version !== VERSION || id.toLowerCase() !== userId.toLowerCase() || !/^\d{1,12}$/.test(expiresRaw)) return false;
  if (!sameMac(signature, mac(key, `${version}.${id}.${expiresRaw}`))) return false;
  return Number(expiresRaw) > nowSeconds;
}

/** The attributes both cookies are written with. `secure` follows the request's protocol. */
export function passcodeCookieOptions(secure: boolean, maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}
