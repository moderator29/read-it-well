import { describe, expect, it } from "vitest";
import { carriesSessionCookie } from "./session-cookie";

describe("carriesSessionCookie", () => {
  it("reads a Supabase session cookie, whole or chunked, as signed in", () => {
    expect(carriesSessionCookie(["sb-abc-auth-token"])).toBe(true);
    expect(carriesSessionCookie(["nf-visit", "sb-abc-auth-token.0", "sb-abc-auth-token.1"])).toBe(true);
  });

  it("does not count a sign-in still in flight", () => {
    expect(carriesSessionCookie(["sb-abc-auth-token-code-verifier"])).toBe(false);
  });

  it("reads no cookie, or only other cookies, as signed out", () => {
    expect(carriesSessionCookie([])).toBe(false);
    expect(carriesSessionCookie(["nf-intro", "NEXT_LOCALE", "auth-token"])).toBe(false);
  });
});
