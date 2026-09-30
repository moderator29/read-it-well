import { describe, expect, it } from "vitest";
import { isFirstCodeSignIn, JUST_CONFIRMED_MS } from "./first-sign-in";

const NOW = Date.parse("2026-09-30T10:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("isFirstCodeSignIn", () => {
  it("is a first when this code just confirmed the address or the number", () => {
    expect(isFirstCodeSignIn({ email_confirmed_at: ago(2_000) }, "email", NOW)).toBe(true);
    expect(isFirstCodeSignIn({ phone_confirmed_at: ago(JUST_CONFIRMED_MS - 1) }, "phone", NOW)).toBe(true);
  });

  it("is not a first for an address confirmed before, or for the other channel's stamp", () => {
    expect(isFirstCodeSignIn({ email_confirmed_at: ago(JUST_CONFIRMED_MS + 1) }, "email", NOW)).toBe(false);
    expect(isFirstCodeSignIn({ email_confirmed_at: ago(30 * 24 * 3600 * 1000) }, "email", NOW)).toBe(false);
    expect(isFirstCodeSignIn({ email_confirmed_at: ago(1_000) }, "phone", NOW)).toBe(false);
    expect(isFirstCodeSignIn({ phone_confirmed_at: ago(1_000) }, "email", NOW)).toBe(false);
  });

  it("is not a first with no stamp, an unreadable one, or one from the future", () => {
    expect(isFirstCodeSignIn(null, "email", NOW)).toBe(false);
    expect(isFirstCodeSignIn({}, "phone", NOW)).toBe(false);
    expect(isFirstCodeSignIn({ email_confirmed_at: "not a date" }, "email", NOW)).toBe(false);
    expect(isFirstCodeSignIn({ email_confirmed_at: new Date(NOW + 5 * 60_000).toISOString() }, "email", NOW)).toBe(false);
  });
});
