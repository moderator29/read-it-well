import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The ceiling on guesses against ONE account.
 *
 * Sign-in was counted per connection only: ten a minute from one place, which
 * is ten a minute from EVERY place, so a run spread over many addresses had
 * unlimited guesses at any one account on a platform that holds wallet
 * balances. These prove the second count: it is keyed on the HASH of the
 * address and never the address itself, it is spent before Supabase is asked
 * anything so a refusal costs no round trip and leaks no account existence, it
 * raises a risk alert the moment it trips so nobody has to guess why somebody
 * cannot get in, and a normal attempt still reaches the provider.
 */
const seam = vi.hoisted(() => ({
  consume: vi.fn(),
  alert: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/security/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("../security/rate-limit")>(
    "../security/rate-limit",
  );
  return { ...actual, consume: seam.consume };
});
vi.mock("@/lib/alerts", () => ({ recordAlert: seam.alert }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithPassword: seam.signIn } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: vi.fn() }) }));
vi.mock("@/lib/site", () => ({ authOrigin: async () => "https://example.invalid" }));
vi.mock("./providers", () => ({
  getProviderStates: () => [{ id: "email", configured: true }],
}));

function form(email: string, password: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const ALLOWED = { allowed: true, degraded: false } as const;
const DENIED = { allowed: false, retryAfterSeconds: 1800, retryIn: "in about 30 minutes" } as const;

beforeEach(() => {
  seam.consume.mockReset();
  seam.alert.mockReset();
  seam.signIn.mockReset();
  seam.signIn.mockResolvedValue({ error: null });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
});

describe("the sign-in ceiling on one address", () => {
  it("counts the address as a hash and never as the address itself", async () => {
    seam.consume.mockResolvedValue(ALLOWED);
    const { signInWithEmail } = await import("./actions");

    await signInWithEmail({ ok: false }, form("Ada@example.invalid", "a-password")).catch(() => {
      // The happy path ends in a redirect, which the mock throws.
    });

    const addressCall = seam.consume.mock.calls
      .map(([request]) => request as { bucket: string; subject: string })
      .find((request) => request.bucket === "sign_in_address");
    expect(addressCall).toBeDefined();
    expect(addressCall?.subject).toMatch(/^email:[0-9a-f]{32}$/);
    expect(addressCall?.subject).not.toContain("ada");
    expect(addressCall?.subject).not.toContain("example.invalid");
  });

  it("refuses before the provider is asked anything, and raises an alert", async () => {
    seam.consume.mockImplementation(async (request: { bucket: string }) =>
      request.bucket === "sign_in_address" ? DENIED : ALLOWED,
    );
    const { signInWithEmail } = await import("./actions");

    const result = await signInWithEmail({ ok: false }, form("ada@example.invalid", "a-password"));

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Too many attempts");
    // Nothing was asked of Supabase, so the refusal costs no round trip and
    // cannot tell an attacker whether the account exists.
    expect(seam.signIn).not.toHaveBeenCalled();
    expect(seam.alert).toHaveBeenCalledTimes(1);
    const [raised] = seam.alert.mock.calls[0] as [{ kind: string; subjectId: string }];
    expect(raised.kind).toBe("auth.sign_in.address_ceiling");
    expect(raised.subjectId).toMatch(/^email:[0-9a-f]{32}$/);
  });

  it("lets a normal attempt through to the provider and raises nothing", async () => {
    seam.consume.mockResolvedValue(ALLOWED);
    const { signInWithEmail } = await import("./actions");

    await signInWithEmail({ ok: false }, form("ada@example.invalid", "a-password")).catch(() => {
      // redirect
    });

    expect(seam.signIn).toHaveBeenCalledTimes(1);
    expect(seam.alert).not.toHaveBeenCalled();
  });

  it("still refuses on the per connection count, which is spent first", async () => {
    seam.consume.mockImplementation(async (request: { bucket: string }) =>
      request.bucket === "sign_in" ? DENIED : ALLOWED,
    );
    const { signInWithEmail } = await import("./actions");

    const result = await signInWithEmail({ ok: false }, form("ada@example.invalid", "a-password"));

    expect(result.ok).toBe(false);
    expect(seam.signIn).not.toHaveBeenCalled();
    // A connection ceiling is not one account being attacked, so no alert.
    expect(seam.alert).not.toHaveBeenCalled();
  });
});
