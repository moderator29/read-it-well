import { beforeEach, describe, expect, it, vi } from "vitest";

import { AI_CONSENT_COOKIE, AI_CONSENT_VERSION, consentCookieValue } from "./consent";

vi.mock("server-only", () => ({}));

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}));

const { hasAiConsent } = await import("./consent-server");

/** A client whose profile row carries the given settings. */
function account(settings: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: { settings }, error: null }),
  };
  return { from: () => chain } as never;
}

const agreed = { aiConsent: { version: AI_CONSENT_VERSION, at: "2026-09-24T10:00:00.000Z" } };

describe("STORE-07: whose agreement counts", () => {
  beforeEach(() => jar.clear());

  it("signed in, the stored record decides even when the device has the cookie", async () => {
    jar.set(AI_CONSENT_COOKIE, consentCookieValue());
    expect(await hasAiConsent({ supabase: account({}), userId: "u1" })).toBe(false);
  });

  it("signed in with the stored record, yes", async () => {
    expect(await hasAiConsent({ supabase: account(agreed), userId: "u1" })).toBe(true);
  });

  it("signed in with an agreement to an older disclosure, no", async () => {
    const old = { aiConsent: { version: "2020-01-01", at: "2020-01-01T00:00:00.000Z" } };
    expect(await hasAiConsent({ supabase: account(old), userId: "u1" })).toBe(false);
  });

  it("signed out, the device's cookie is all there is", async () => {
    expect(await hasAiConsent({})).toBe(false);
    jar.set(AI_CONSENT_COOKIE, consentCookieValue());
    expect(await hasAiConsent({})).toBe(true);
  });

  it("a failed read is no", async () => {
    const broken = { from: () => { throw new Error("down"); } } as never;
    expect(await hasAiConsent({ supabase: broken, userId: "u1" })).toBe(false);
  });
});
