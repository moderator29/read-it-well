import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-08: a new password ends every OTHER session. Recovering from a lost
 * phone is the reason people reset a password, and the thief's session used
 * to survive it. The password change itself must not depend on that step.
 */
const seam = vi.hoisted(() => ({ updateUser: vi.fn(), signOut: vi.fn(), consume: vi.fn() }));

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
  const actual = await vi.importActual<typeof import("../security/rate-limit")>("../security/rate-limit");
  return { ...actual, consume: seam.consume };
});
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" } } }),
      updateUser: seam.updateUser,
      signOut: seam.signOut,
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: vi.fn() }) }));
vi.mock("@/lib/site", () => ({ authOrigin: async () => "https://example.invalid" }));
vi.mock("./providers", () => ({ getProviderStates: () => [{ id: "email", configured: true }] }));

function form(password: string): FormData {
  const data = new FormData();
  data.set("password", password);
  data.set("confirmPassword", password);
  return data;
}

beforeEach(() => {
  seam.updateUser.mockReset().mockResolvedValue({ error: null });
  seam.signOut.mockReset().mockResolvedValue({ error: null });
  seam.consume.mockReset().mockResolvedValue({ allowed: true, degraded: false });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("RESEND_API_KEY", "re_test");
});

describe("changing the password", () => {
  it("ends every other session after the new password is saved", async () => {
    const { updatePassword } = await import("./actions");
    await expect(updatePassword({ ok: false }, form("a-new-password-1"))).rejects.toThrow("REDIRECT:/home");
    expect(seam.updateUser).toHaveBeenCalledWith({ password: "a-new-password-1" });
    expect(seam.signOut).toHaveBeenCalledWith({ scope: "others" });
    expect(seam.updateUser.mock.invocationCallOrder[0]).toBeLessThan(seam.signOut.mock.invocationCallOrder[0] ?? 0);
  });

  it("still completes the change when ending the others fails", async () => {
    seam.signOut.mockResolvedValue({ error: { message: "network" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { updatePassword } = await import("./actions");
    await expect(updatePassword({ ok: false }, form("a-new-password-2"))).rejects.toThrow("REDIRECT:/home");
    warn.mockRestore();
  });

  it("ends nothing when the password was not changed", async () => {
    seam.updateUser.mockResolvedValue({ error: { message: "New password should be different from the old password." } });
    const { updatePassword } = await import("./actions");
    const state = await updatePassword({ ok: false }, form("a-new-password-3"));
    expect(state.ok).toBe(false);
    expect(seam.signOut).not.toHaveBeenCalled();
  });
});
