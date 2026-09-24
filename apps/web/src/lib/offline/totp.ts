/**
 * RFC 6238 TIME-BASED ONE-TIME CODES, IN WEBCRYPTO, WITH NO DEPENDENCY. V-35.
 *
 * The gate handshake works with no signal on either phone, and this is the
 * whole reason it can: both phones hold the same per-inspection seed (released
 * by `public.inspection_handshake` while they had signal) and both have a
 * clock, so both compute the same six digits for the same thirty seconds
 * without asking anybody. The lister's phone shows the code; the renter's
 * phone checks it.
 *
 * HMAC-SHA1, 30-second steps, six digits: the RFC's defaults, which is what
 * every authenticator app uses, so a person who has used a bank token already
 * knows the shape. SHA-1's collision weakness does not touch HMAC-SHA1 as a
 * PRF, and the RFC's own test vectors (in the test beside this file) pin the
 * implementation to the standard rather than to itself.
 *
 * CLOCK DRIFT. Two phones' clocks disagree, and a code typed at 29 seconds is
 * checked at 31. `matchesCode` accepts the step before and the step after,
 * which is a 90-second window: the RFC's recommended allowance of one step
 * either side. Wider would make a code a stranger overheard still valid a
 * minute later; narrower fails honest people whose phone is a few seconds out.
 */

export const STEP_SECONDS = 30;
export const DIGITS = 6;

/** Hex (as the database's `encode(seed, 'hex')` returns it) to bytes. */
export function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase();
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** The counter for an instant: whole 30-second steps since the epoch. */
export function stepAt(epochMs: number): number {
  return Math.floor(epochMs / 1000 / STEP_SECONDS);
}

/** Seconds left in the current step, for the countdown under the code. */
export function secondsLeft(epochMs: number): number {
  return STEP_SECONDS - (Math.floor(epochMs / 1000) % STEP_SECONDS);
}

function counterBytes(counter: number): Uint8Array {
  const out = new Uint8Array(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    out[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return out;
}

/**
 * HOTP (RFC 4226) for one counter: HMAC-SHA1, dynamic truncation, modulo
 * 10^digits, zero padded.
 */
export async function hotp(key: Uint8Array, counter: number, digits: number = DIGITS): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, counterBytes(counter) as BufferSource));
  const offset = mac[mac.length - 1]! & 0x0f;
  const binary =
    ((mac[offset]! & 0x7f) << 24) |
    ((mac[offset + 1]! & 0xff) << 16) |
    ((mac[offset + 2]! & 0xff) << 8) |
    (mac[offset + 3]! & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

/** The code for an instant. */
export async function totp(key: Uint8Array, epochMs: number, digits: number = DIGITS): Promise<string> {
  return hotp(key, stepAt(epochMs), digits);
}

/** Only digits, and exactly six of them. Spaces a person typed are dropped. */
export function normaliseCode(input: string): string | null {
  const digits = input.replace(/\s+/g, "");
  return new RegExp(`^\\d{${DIGITS}}$`).test(digits) ? digits : null;
}

/**
 * Does this typed code match the seed now, allowing one step of drift either
 * way? Compared in constant time over the three candidates, so a phone left
 * with somebody cannot be timed into revealing which step was close.
 */
export async function matchesCode(key: Uint8Array, typed: string, epochMs: number): Promise<boolean> {
  const code = normaliseCode(typed);
  if (!code) return false;
  const step = stepAt(epochMs);
  const candidates = await Promise.all([step - 1, step, step + 1].map((s) => hotp(key, s)));
  let matched = false;
  for (const candidate of candidates) {
    let diff = 0;
    for (let i = 0; i < DIGITS; i += 1) diff |= candidate.charCodeAt(i) ^ code.charCodeAt(i);
    if (diff === 0) matched = true;
  }
  return matched;
}
