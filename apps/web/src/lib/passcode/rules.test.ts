import { describe, expect, it } from "vitest";
import {
  attemptsLeft,
  cooldownRemaining,
  idleExpired,
  IDLE_LOCK_MS,
  isFreshSignIn,
  isTrivialCode,
  isWellFormed,
  latestSignInSeconds,
  nextWrongStartsCooldown,
  setupRefusal,
} from "./rules";

/**
 * The passcode's pure rules (docs/PASSCODE.md). The trivial-code list is the
 * same one the migration's probe refuses in the database, so a code this file
 * accepts and the database refuses (or the reverse) is caught on both sides.
 */
describe("the trivial-code rule", () => {
  it("refuses one repeated digit, at either length", () => {
    for (const code of ["000000", "111111", "999999", "0000", "7777"]) expect(isTrivialCode(code), code).toBe(true);
  });

  it("refuses straight runs up and down, including the named ones", () => {
    for (const code of ["123456", "654321", "1234", "4321", "345678", "987654", "0123", "6789", "012345", "543210"]) {
      expect(isTrivialCode(code), code).toBe(true);
    }
  });

  it("refuses the birth year only when it is known", () => {
    expect(isTrivialCode("1988", { birthYear: 1988 })).toBe(true);
    expect(isTrivialCode("1988")).toBe(false);
    expect(isTrivialCode("1988", { birthYear: 1990 })).toBe(false);
  });

  it("accepts ordinary codes, and codes that only look run-like", () => {
    for (const code of ["480913", "730258", "580317", "7302", "2468", "135790", "121212", "890123"]) {
      expect(isTrivialCode(code), code).toBe(false);
    }
  });

  it("treats anything that is not digits as refused", () => {
    expect(isTrivialCode("48a913")).toBe(true);
    expect(isTrivialCode("")).toBe(true);
  });
});

describe("setup refusals, in the order the screen meets them", () => {
  it("checks the length, then the rule, then the confirmation", () => {
    expect(setupRefusal("48091", "48091", 6)).toBe("length");
    expect(setupRefusal("4809", "4809", 6)).toBe("length");
    expect(setupRefusal("123456", "123456", 6)).toBe("trivial");
    expect(setupRefusal("480913", "480914", 6)).toBe("mismatch");
    expect(setupRefusal("480913", "480913", 6)).toBeNull();
    expect(setupRefusal("7302", "7302", 4)).toBeNull();
  });

  it("reads only ASCII digits as well formed", () => {
    expect(isWellFormed("480913", 6)).toBe(true);
    expect(isWellFormed("٤٨٠٩١٣", 6)).toBe(false);
    expect(isWellFormed("4809 3", 6)).toBe(false);
  });
});

describe("the cooldown maths", () => {
  it("counts down to the pause at five and the sign-out at ten", () => {
    expect(attemptsLeft(0)).toEqual({ beforeCooldown: 5, beforeSignOut: 10 });
    expect(attemptsLeft(1)).toEqual({ beforeCooldown: 4, beforeSignOut: 9 });
    expect(attemptsLeft(4)).toEqual({ beforeCooldown: 1, beforeSignOut: 6 });
    expect(attemptsLeft(5)).toEqual({ beforeCooldown: 5, beforeSignOut: 5 });
    expect(attemptsLeft(9)).toEqual({ beforeCooldown: 1, beforeSignOut: 1 });
    expect(attemptsLeft(10)).toEqual({ beforeCooldown: 0, beforeSignOut: 0 });
    expect(attemptsLeft(-3)).toEqual({ beforeCooldown: 5, beforeSignOut: 10 });
  });

  it("starts a cooldown on the fifth wrong try, and not on the tenth (that one signs out)", () => {
    expect(nextWrongStartsCooldown(3)).toBe(false);
    expect(nextWrongStartsCooldown(4)).toBe(true);
    expect(nextWrongStartsCooldown(8)).toBe(false);
    expect(nextWrongStartsCooldown(9)).toBe(false);
  });

  it("says how many whole seconds of a cooldown are left", () => {
    const now = Date.parse("2026-09-29T10:00:00Z");
    expect(cooldownRemaining("2026-09-29T10:00:30Z", now)).toBe(30);
    expect(cooldownRemaining("2026-09-29T10:00:00.200Z", now)).toBe(1);
    expect(cooldownRemaining("2026-09-29T09:59:59Z", now)).toBe(0);
    expect(cooldownRemaining(null, now)).toBe(0);
    expect(cooldownRemaining("not a date", now)).toBe(0);
    expect(cooldownRemaining(now + 12_000, now)).toBe(12);
  });
});

describe("freshness and idleness", () => {
  const now = 1_790_000_000;

  it("reads the newest sign-in of any method from amr", () => {
    expect(latestSignInSeconds([{ method: "password", timestamp: now - 500 }, { method: "oauth", timestamp: now - 20 }])).toBe(now - 20);
    expect(latestSignInSeconds(null)).toBeNull();
    expect(latestSignInSeconds([{ method: "password" }])).toBeNull();
  });

  it("counts a sign-in as fresh only inside the window", () => {
    const amr = [{ method: "password", timestamp: now - 200 }];
    expect(isFreshSignIn(amr, now, 300)).toBe(true);
    expect(isFreshSignIn(amr, now, 100)).toBe(false);
    expect(isFreshSignIn([{ method: "otp", timestamp: now + 30 }], now, 300)).toBe(true);
    expect(isFreshSignIn([{ method: "otp", timestamp: now + 3600 }], now, 300)).toBe(false);
    expect(isFreshSignIn("amr", now, 300)).toBe(false);
  });

  it("locks after five minutes without activity", () => {
    expect(idleExpired(0, IDLE_LOCK_MS - 1)).toBe(false);
    expect(idleExpired(0, IDLE_LOCK_MS)).toBe(true);
  });
});
