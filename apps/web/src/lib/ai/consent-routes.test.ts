import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * STORE-07: neither AI route sends a word to Anthropic without this person's
 * recorded agreement, whatever the screen did. Drives the real route handlers
 * with the outside world stood in, and watches the one call that matters: the
 * fetch to api.anthropic.com.
 */
const seam = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  settings: {} as Record<string, unknown>,
  signedIn: true,
  fetches: [] as string[],
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "vallo_ai_consent" && seam.cookie ? { value: seam.cookie } : undefined),
  }),
  headers: async () => new Headers(),
}));
vi.mock("@/lib/flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("@/lib/security/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("../security/rate-limit")>("../security/rate-limit");
  return { ...actual, consume: async () => ({ allowed: true, degraded: false }) };
});
const client = {
  auth: { getUser: async () => ({ data: { user: seam.signedIn ? { id: "u1", email: "a@example.invalid" } : null } }) },
  from: () => ({
    select: () => ({
      eq: () => ({ maybeSingle: async () => ({ data: { settings: seam.settings } }) }),
    }),
  }),
};
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => client }));
vi.mock("@/lib/support/tools", async () => {
  const actual = await vi.importActual<typeof import("../support/tools")>("../support/tools");
  return {
    ...actual,
    resolveSupportCaller: async () =>
      seam.signedIn ? { state: "signed-in", supabase: client, user: { id: "u1" } } : { state: "signed-out" },
  };
});

function post(url: string) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "Where can I rent in Yaba?" }] }),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  seam.cookie = undefined;
  seam.settings = {};
  seam.signedIn = true;
  seam.fetches = [];
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal("fetch", async (url: string) => {
    seam.fetches.push(String(url));
    return new Response("data: {\"type\":\"message_stop\"}\n\n", { status: 200, headers: { "content-type": "text/event-stream" } });
  });
});

describe.each([
  ["/api/support", async () => (await import("@/app/api/support/route")).POST],
  ["/api/assistant", async () => (await import("@/app/api/assistant/route")).POST],
])("%s", (path, load) => {
  it("refuses 403 ai-consent-required and never calls Anthropic without consent", async () => {
    const POST = await load();
    const response = await POST(post(`https://www.vallospaces.com${path}`));
    expect(response.status).toBe(403);
    expect(((await response.json()) as { code: string }).code).toBe("ai-consent-required");
    expect(seam.fetches.some((url) => url.includes("anthropic.com"))).toBe(false);
  });

  it("refuses consent given to an earlier wording", async () => {
    seam.settings = { aiConsent: { version: "2020-01-01", at: "2020-01-01T00:00:00.000Z" } };
    const POST = await load();
    expect((await POST(post(`https://www.vallospaces.com${path}`))).status).toBe(403);
  });

  it("goes ahead once the account records today's consent", async () => {
    const { AI_CONSENT_VERSION } = await import("./consent");
    seam.settings = { aiConsent: { version: AI_CONSENT_VERSION, at: "2026-09-24T00:00:00.000Z" } };
    const POST = await load();
    const response = await POST(post(`https://www.vallospaces.com${path}`));
    expect(response.status).toBe(200);
    await response.text();
    expect(seam.fetches.some((url) => url.includes("api.anthropic.com"))).toBe(true);
  });

  it("signed in, a device cookie without the account record is refused", async () => {
    const { consentCookieValue } = await import("./consent");
    seam.cookie = consentCookieValue();
    const POST = await load();
    const response = await POST(post(`https://www.vallospaces.com${path}`));
    expect(response.status).toBe(403);
    expect(seam.fetches.some((url) => url.includes("anthropic.com"))).toBe(false);
  });
});
