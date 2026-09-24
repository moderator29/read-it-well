import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * STORE-02. The browser client must never exchange a code or token it finds
 * in the URL: that would let a hand-started OAuth round trip land a session
 * without passing the server's provider refusal.
 */
const seam = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => {
    seam.calls.push(args);
    return {};
  },
}));

beforeEach(() => {
  seam.calls = [];
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});

describe("the browser Supabase client", () => {
  it("is built with URL session detection off", async () => {
    vi.resetModules();
    const { createClient } = await import("./client");
    createClient();
    const options = seam.calls[0]?.[2] as { auth?: { detectSessionInUrl?: boolean } } | undefined;
    expect(options?.auth?.detectSessionInUrl).toBe(false);
  });
});
