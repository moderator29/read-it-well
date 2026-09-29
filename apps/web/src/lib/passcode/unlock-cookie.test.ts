import { describe, expect, it } from "vitest";
import { UNLOCK_IDLE_SECONDS, UNLOCK_MAX_SECONDS } from "./rules";
import {
  deriveKey,
  passcodeKey,
  readResetIntent,
  readUnlock,
  RESET_INTENT_SECONDS,
  signResetIntent,
  signUnlock,
} from "./unlock-cookie";

/** The signed unlock cookie (docs/PASSCODE.md): what it accepts, and everything it refuses. */
const KEY = deriveKey("a-test-secret-that-is-long-enough", "unlock");
const OTHER_KEY = deriveKey("another-secret-that-is-long-enough", "unlock");
const USER = "5f1c9a2e-7b1d-4c3e-9a8b-0c1d2e3f4a5b";
const STRANGER = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const NOW = 1_790_000_000;

describe("the unlock cookie", () => {
  it("reads back what it signed, for the same user, before it lapses", () => {
    const value = signUnlock(KEY, USER, NOW);
    expect(readUnlock(KEY, value, USER, NOW + 10)).toEqual({ userId: USER, issuedAt: NOW, expiresAt: NOW + UNLOCK_IDLE_SECONDS });
  });

  it("lapses after fifteen idle minutes", () => {
    const value = signUnlock(KEY, USER, NOW);
    expect(readUnlock(KEY, value, USER, NOW + UNLOCK_IDLE_SECONDS - 1)).not.toBeNull();
    expect(readUnlock(KEY, value, USER, NOW + UNLOCK_IDLE_SECONDS)).toBeNull();
  });

  it("slides on a touch, keeping its issue time, and never past twelve hours", () => {
    const later = NOW + 14 * 60;
    const slid = signUnlock(KEY, USER, later, NOW);
    expect(readUnlock(KEY, slid, USER, later + UNLOCK_IDLE_SECONDS - 1)?.issuedAt).toBe(NOW);
    const nearCap = NOW + UNLOCK_MAX_SECONDS - 60;
    const capped = signUnlock(KEY, USER, nearCap, NOW);
    expect(readUnlock(KEY, capped, USER, nearCap + 30)).not.toBeNull();
    expect(readUnlock(KEY, capped, USER, NOW + UNLOCK_MAX_SECONDS)).toBeNull();
  });

  it("unlocks nobody else", () => {
    expect(readUnlock(KEY, signUnlock(KEY, USER, NOW), STRANGER, NOW + 1)).toBeNull();
  });

  it("refuses a forgery, a tampered expiry, another key and junk", () => {
    const value = signUnlock(KEY, USER, NOW);
    const parts = value.split(".");
    const stretched = [parts[0], parts[1], parts[2], String(NOW + 10 * 3600), parts[4]].join(".");
    expect(readUnlock(KEY, stretched, USER, NOW + 1)).toBeNull();
    expect(readUnlock(OTHER_KEY, value, USER, NOW + 1)).toBeNull();
    const swapped = [parts[0], STRANGER, parts[2], parts[3], parts[4]].join(".");
    expect(readUnlock(KEY, swapped, STRANGER, NOW + 1)).toBeNull();
    for (const junk of ["", "v1", "v1.x.y.z.w", `v2.${USER}.${NOW}.${NOW + 900}.${parts[4]}`, value + "x", "a".repeat(400)]) {
      expect(readUnlock(KEY, junk, USER, NOW + 1), junk.slice(0, 20)).toBeNull();
    }
    expect(readUnlock(KEY, undefined, USER, NOW)).toBeNull();
  });

  it("refuses one issued in the future", () => {
    expect(readUnlock(KEY, signUnlock(KEY, USER, NOW + 3600), USER, NOW)).toBeNull();
  });
});

describe("the reset intent", () => {
  const RESET = deriveKey("a-test-secret-that-is-long-enough", "reset");

  it("holds for thirty minutes, for this user, under its own key", () => {
    const value = signResetIntent(RESET, USER, NOW);
    expect(readResetIntent(RESET, value, USER, NOW + RESET_INTENT_SECONDS - 1)).toBe(true);
    expect(readResetIntent(RESET, value, USER, NOW + RESET_INTENT_SECONDS)).toBe(false);
    expect(readResetIntent(RESET, value, STRANGER, NOW)).toBe(false);
    expect(readResetIntent(KEY, value, USER, NOW)).toBe(false);
  });
});

describe("the key", () => {
  it("is derived from the service key per purpose, never the key itself, and absent without one", () => {
    const env = { SUPABASE_SERVICE_ROLE_KEY: "service-role-key-for-a-test-only" } as unknown as NodeJS.ProcessEnv;
    const unlock = passcodeKey("unlock", env);
    const reset = passcodeKey("reset", env);
    expect(unlock).not.toBeNull();
    expect(unlock?.equals(reset as Buffer)).toBe(false);
    expect(unlock?.toString("utf8")).not.toContain("service-role");
    expect(passcodeKey("unlock", {} as NodeJS.ProcessEnv)).toBeNull();
  });
});
