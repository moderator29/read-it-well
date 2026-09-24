import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * STORE-02 / STORE-03: a switched-off provider is REFUSED BY THE SERVER, not
 * only left undrawn. A form posted by hand to `startOAuth("google")` never
 * reaches Supabase, and a Google session made by building the authorize URL by
 * hand is ended at the callback before it is used.
 */
const seam = vi.hoisted(() => ({
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)",
  signInWithOAuth: vi.fn(),
  exchange: vi.fn(),
  signOut: vi.fn(),
  session: { access_token: "" } as { access_token: string },
  identities: [] as Array<{ provider: string; last_sign_in_at: string }>,
  appleEnabled: false,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": seam.userAgent, "x-forwarded-for": "203.0.113.7" }),
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithOAuth: seam.signInWithOAuth,
      exchangeCodeForSession: seam.exchange,
      signOut: seam.signOut,
      getSession: async () => ({ data: { session: seam.session } }),
      getUser: async () => ({ data: { user: { id: "u1", identities: seam.identities } } }),
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: vi.fn() }) }));
vi.mock("@/lib/site", () => ({ authOrigin: async () => "https://example.invalid" }));
vi.mock("@/lib/notify/welcome", () => ({ welcomeOnce: vi.fn() }));
vi.mock("@/lib/supabase/env", () => ({
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  isSupabaseConfigured: () => true,
}));

function token(method: string): string {
  return `h.${Buffer.from(JSON.stringify({ amr: [{ method, timestamp: 1 }] })).toString("base64url")}.s`;
}

beforeEach(() => {
  seam.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)";
  seam.signInWithOAuth.mockReset();
  seam.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.example/authorize" }, error: null });
  seam.exchange.mockReset();
  seam.exchange.mockResolvedValue({ error: null });
  seam.signOut.mockReset();
  seam.signOut.mockResolvedValue({ error: null });
  seam.appleEnabled = false;
  vi.unstubAllEnvs();
  /* What Supabase reports about its own providers: Google IS enabled in the
     dashboard today, which is exactly why the app must refuse it itself. */
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    json: async () => ({ external: { google: true, apple: seam.appleEnabled, email: true } }),
  }));
});

describe("startOAuth", () => {
  it("refuses Google by default and never asks Supabase", async () => {
    const { startOAuth } = await import("./actions");
    const result = await startOAuth("google", new FormData());
    expect(result.ok).toBe(false);
    expect(seam.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("refuses Apple while Supabase does not report it enabled", async () => {
    const { startOAuth } = await import("./actions");
    expect((await startOAuth("apple", new FormData())).ok).toBe(false);
    expect(seam.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("starts Apple on the website once Supabase reports it enabled", async () => {
    seam.appleEnabled = true;
    const { startOAuth } = await import("./actions");
    await expect(startOAuth("apple", new FormData())).rejects.toThrow("REDIRECT:https://accounts.example/authorize");
  });

  it("refuses every redirect provider inside a native shell, even an enabled one", async () => {
    seam.appleEnabled = true;
    vi.stubEnv("VALLO_SOCIAL_SIGN_IN", "google");
    seam.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) VALLO-NATIVE";
    const { startOAuth } = await import("./actions");
    expect((await startOAuth("google", new FormData())).ok).toBe(false);
    expect((await startOAuth("apple", new FormData())).ok).toBe(false);
    expect(seam.signInWithOAuth).not.toHaveBeenCalled();
  });
});

describe("the callback", () => {
  it("ends a Google session it was never meant to receive", async () => {
    seam.session = { access_token: token("oauth") };
    seam.identities = [{ provider: "google", last_sign_in_at: "2026-09-23T11:43:19Z" }];
    const { completeEmailVerification } = await import("./actions");
    const outcome = await completeEmailVerification({ code: "abc" });
    expect(outcome).toEqual({ ok: false, reason: "provider-off" });
    expect(seam.signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps an email confirmation, which no provider made", async () => {
    seam.session = { access_token: token("otp") };
    seam.identities = [{ provider: "email", last_sign_in_at: "2026-09-23T11:43:19Z" }];
    const { completeEmailVerification } = await import("./actions");
    const outcome = await completeEmailVerification({ code: "abc", next: "/home" });
    expect(outcome).toEqual({ ok: true, next: "/home" });
    expect(seam.signOut).not.toHaveBeenCalled();
  });

  it("keeps an Apple session once Apple is on", async () => {
    seam.appleEnabled = true;
    seam.session = { access_token: token("oauth") };
    seam.identities = [{ provider: "apple", last_sign_in_at: "2026-09-23T11:43:19Z" }];
    const { completeEmailVerification } = await import("./actions");
    expect((await completeEmailVerification({ code: "abc" })).ok).toBe(true);
    expect(seam.signOut).not.toHaveBeenCalled();
  });
});
