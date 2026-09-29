/**
 * THE PASSCODE'S RULES, AS PURE FUNCTIONS. docs/PASSCODE.md is the design.
 *
 * Shared by the browser (the setup screen refuses a trivial code before it is
 * sent, and the lock screen counts what is left) and the server (the gate and
 * the actions). The database is the authority on every one of these:
 * `public.passcode_set` refuses the same trivial codes and
 * `private.passcode_attempt` keeps the count, in
 * `supabase/migrations/20260929034124_passcode_member_app_lock_code_bcrypt_only.sql`.
 * If the two ever disagree, the database wins and this file is the bug.
 */

export const PASSCODE_LENGTHS = [6, 4] as const;
export type PasscodeLength = (typeof PASSCODE_LENGTHS)[number];
export const DEFAULT_PASSCODE_LENGTH: PasscodeLength = 6;

/** Wrong attempts in a row that earn a cooldown, and how long it lasts. */
export const ATTEMPTS_PER_COOLDOWN = 5;
export const COOLDOWN_SECONDS = 30;
/** Cumulative wrong attempts after which the member is signed out. */
export const SIGN_OUT_AFTER_ATTEMPTS = 10;

/** No touch, key or scroll for this long, or hidden for this long, locks the app. */
export const IDLE_LOCK_MS = 5 * 60 * 1000;
/** The unlock cookie slides: it lapses after this long with no request. */
export const UNLOCK_IDLE_SECONDS = 15 * 60;
/** And it never outlives this, however busy the member is. */
export const UNLOCK_MAX_SECONDS = 12 * 60 * 60;
/** A sign-in this recent counts as unlocked: the password was just typed. */
export const FRESH_UNLOCK_SECONDS = 5 * 60;
/** A sign-in this recent may set a new code without the old one (the SQL's 900). */
export const FRESH_RESET_SECONDS = 15 * 60;

export function isPasscodeLength(value: unknown): value is PasscodeLength {
  return value === 6 || value === 4;
}

/** Exactly `length` ASCII digits. */
export function isWellFormed(code: string, length: PasscodeLength): boolean {
  return code.length === length && /^[0-9]+$/.test(code);
}

/**
 * A code anybody would guess first: one digit repeated (000000, 1111), a
 * straight run up or down (123456, 654321, 1234, 3456), or the member's birth
 * year when it is known. Mirrors `private.passcode_is_trivial`.
 */
export function isTrivialCode(code: string, options: { birthYear?: number | null } = {}): boolean {
  if (!/^[0-9]+$/.test(code)) return true;
  if (/^(\d)\1*$/.test(code)) return true;
  if ("0123456789".includes(code) || "9876543210".includes(code)) return true;
  const year = options.birthYear;
  if (typeof year === "number" && Number.isInteger(year) && String(year) === code) return true;
  return false;
}

export type SetupRefusal = "length" | "trivial" | "mismatch";

/** What is wrong with a code and its confirmation, or null when it may be sent. */
export function setupRefusal(
  code: string,
  confirm: string,
  length: PasscodeLength,
  options: { birthYear?: number | null } = {},
): SetupRefusal | null {
  if (!isWellFormed(code, length)) return "length";
  if (isTrivialCode(code, options)) return "trivial";
  if (code !== confirm) return "mismatch";
  return null;
}

/**
 * How many more wrong attempts before the next cooldown and before the
 * sign-out, after `failedCount` wrong ones. Both are at least zero.
 */
export function attemptsLeft(failedCount: number): { beforeCooldown: number; beforeSignOut: number } {
  const failed = Math.max(0, Math.floor(failedCount));
  const beforeSignOut = Math.max(0, SIGN_OUT_AFTER_ATTEMPTS - failed);
  const intoCycle = failed % ATTEMPTS_PER_COOLDOWN;
  const beforeCooldown = Math.min(beforeSignOut, ATTEMPTS_PER_COOLDOWN - intoCycle);
  return { beforeCooldown, beforeSignOut };
}

/** Whether the next wrong attempt starts a cooldown (and not the sign-out). */
export function nextWrongStartsCooldown(failedCount: number): boolean {
  const next = Math.max(0, Math.floor(failedCount)) + 1;
  return next < SIGN_OUT_AFTER_ATTEMPTS && next % ATTEMPTS_PER_COOLDOWN === 0;
}

/** Whole seconds left in a cooldown ending at `lockedUntil`, zero when it is over or absent. */
export function cooldownRemaining(lockedUntil: string | number | Date | null | undefined, nowMs: number): number {
  if (lockedUntil === null || lockedUntil === undefined) return 0;
  const until = lockedUntil instanceof Date ? lockedUntil.getTime() : typeof lockedUntil === "number" ? lockedUntil : Date.parse(lockedUntil);
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, Math.ceil((until - nowMs) / 1000));
}

/**
 * The newest sign-in in the verified token's `amr` claim, in seconds, or
 * null. Every method counts (password, oauth, otp, recovery): each is a full
 * sign-in the passcode sits on top of.
 */
export function latestSignInSeconds(amr: unknown): number | null {
  if (!Array.isArray(amr)) return null;
  let latest: number | null = null;
  for (const entry of amr) {
    if (!entry || typeof entry !== "object") continue;
    const timestamp = (entry as { timestamp?: unknown }).timestamp;
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) continue;
    if (latest === null || timestamp > latest) latest = timestamp;
  }
  return latest;
}

/** Did this session sign in within `windowSeconds`? Tolerates a minute of clock skew. */
export function isFreshSignIn(amr: unknown, nowSeconds: number, windowSeconds: number): boolean {
  const latest = latestSignInSeconds(amr);
  if (latest === null) return false;
  const age = nowSeconds - latest;
  return age >= -60 && age <= windowSeconds;
}

/** Idle for long enough to lock, measured from the last activity. */
export function idleExpired(lastActivityMs: number, nowMs: number, limitMs: number = IDLE_LOCK_MS): boolean {
  return nowMs - lastActivityMs >= limitMs;
}
