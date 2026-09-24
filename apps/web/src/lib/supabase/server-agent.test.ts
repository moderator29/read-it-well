import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-08: the device a person signs in on is recorded, because the server
 * client forwards their User-Agent to GoTrue. Before this, sign-in ran from a
 * server action with the runtime's own agent, and every session on
 * `/settings/devices` read "Device not recorded" (live: 92 sessions on the QA
 * member, every one `node`).
 *
 * This drives the real `@supabase/ssr` client through `createClient` and reads
 * the header off the request that reaches GoTrue's `/token` endpoint.
 */
const seam = vi.hoisted(() => ({ agent: null as string | null }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(seam.agent ? { "user-agent": seam.agent } : {}),
  cookies: async () => ({ getAll: () => [], set: () => undefined }),
}));

const BROWSER =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36";

let seen: Headers[] = [];

beforeEach(() => {
  seen = [];
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Headers(init?.headers));
      return new Response(JSON.stringify({ error: "invalid_grant", error_description: "Invalid login credentials" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function signIn() {
  const { createClient } = await import("./server");
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: "someone@example.invalid", password: "not-the-password" });
}

describe("the server client forwards the visitor's device to GoTrue", () => {
  it("sends the browser's User-Agent on the sign-in request", async () => {
    seam.agent = BROWSER;
    await signIn();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]?.get("user-agent")).toBe(BROWSER);
  });

  it("caps an oversized header rather than storing it whole", async () => {
    seam.agent = `Mozilla/5.0 ${"x".repeat(2000)}`;
    await signIn();
    expect(seen[0]?.get("user-agent")?.length).toBe(512);
  });

  it("adds nothing when the request carried no User-Agent", async () => {
    seam.agent = null;
    await signIn();
    expect(seen[0]?.get("user-agent")).not.toBe(BROWSER);
  });
});
