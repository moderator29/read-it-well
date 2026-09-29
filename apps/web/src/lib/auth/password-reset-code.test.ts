import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The reset code: the fallback for a reset link opened where its PKCE
 * verifier is not (a mail app's browser, another phone, another browser).
 *
 * Held here: the code is verified as a RECOVERY one-time code, the refusal is
 * one neutral sentence whatever the address, the throttle is spent before
 * Supabase is asked, and the session a right code makes is enough for
 * /reset-password to set a new password without the old one.
 */
const nowSeconds = () => Math.floor(Date.now() / 1000);

const seam = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  consume: vi.fn(),
  getClaims: vi.fn(),
  reauthenticate: vi.fn(),
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
  const actual = await vi.importActual<typeof import("../security/rate-limit")>("../security/rate-limit");
  return { ...actual, consume: seam.consume };
});
vi.mock("@/lib/alerts", () => ({ recordAlert: vi.fn() }));
vi.mock("@/lib/security/agent-client", () => ({
  createClientWithAgent: async () => ({ auth: { verifyOtp: seam.verifyOtp } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62",
            email: "member@example.invalid",
            identities: [{ provider: "email" }],
          },
        },
      }),
      getClaims: seam.getClaims,
      updateUser: seam.updateUser,
      signOut: seam.signOut,
    },
  }),
}));
vi.mock("@/lib/account-deletion/reauthenticate", () => ({ reauthenticate: seam.reauthenticate }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: vi.fn() }) }));
vi.mock("@/lib/site", () => ({ authOrigin: async () => "https://example.invalid" }));
vi.mock("./providers", () => ({ getProviderStates: () => [{ id: "email", configured: true }] }));

function codeForm(email: string, code: string): FormData {
  const data = new FormData();
  data.set("email", email);
  data.set("code", code);
  return data;
}

function passwordForm(password: string): FormData {
  const data = new FormData();
  data.set("password", password);
  data.set("confirmPassword", password);
  return data;
}

beforeEach(() => {
  seam.verifyOtp.mockReset().mockResolvedValue({ data: { session: null, user: null }, error: { message: "Token has expired or is invalid" } });
  seam.updateUser.mockReset().mockResolvedValue({ error: null });
  seam.signOut.mockReset().mockResolvedValue({ error: null });
  seam.consume.mockReset().mockResolvedValue({ allowed: true, degraded: false });
  seam.getClaims.mockReset().mockResolvedValue({ data: { claims: { amr: [] } } });
  seam.reauthenticate.mockReset().mockResolvedValue(false);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("RESEND_API_KEY", "re_test");
});

describe("the reset code", () => {
  it("is checked as a recovery code and lands on /reset-password", async () => {
    seam.verifyOtp.mockResolvedValue({ data: { session: { access_token: "t" }, user: { id: "u" } }, error: null });
    const { verifyPasswordResetCode } = await import("./actions");
    await expect(
      verifyPasswordResetCode({ ok: false }, codeForm(" Member@Example.invalid ", "482 913")),
    ).rejects.toThrow("REDIRECT:/reset-password");
    expect(seam.verifyOtp).toHaveBeenCalledWith({
      email: "member@example.invalid",
      token: "482913",
      type: "recovery",
    });
  });

  it("answers a wrong code and an unknown address with the same sentence", async () => {
    const { verifyPasswordResetCode } = await import("./actions");
    const wrong = await verifyPasswordResetCode({ ok: false }, codeForm("member@example.invalid", "000000"));
    seam.verifyOtp.mockResolvedValue({ data: { session: null, user: null }, error: { message: "User not found" } });
    const nobody = await verifyPasswordResetCode({ ok: false }, codeForm("nobody@example.invalid", "000000"));
    expect(wrong.ok).toBe(false);
    expect(wrong.fieldErrors?.code).toBeTruthy();
    expect(nobody).toEqual(wrong);
  });

  it("refuses a malformed code before asking Supabase anything", async () => {
    const { verifyPasswordResetCode } = await import("./actions");
    const state = await verifyPasswordResetCode({ ok: false }, codeForm("member@example.invalid", "12ab"));
    expect(state.fieldErrors?.code).toBeTruthy();
    expect(seam.verifyOtp).not.toHaveBeenCalled();
    expect(seam.consume).not.toHaveBeenCalled();
  });

  it("is throttled before Supabase is asked", async () => {
    seam.consume.mockResolvedValue({ allowed: false, degraded: false, retryIn: "in a minute" });
    const { verifyPasswordResetCode } = await import("./actions");
    const state = await verifyPasswordResetCode({ ok: false }, codeForm("member@example.invalid", "482913"));
    expect(state.ok).toBe(false);
    expect(state.message).toMatch(/Too many attempts/);
    expect(seam.verifyOtp).not.toHaveBeenCalled();
    expect(seam.consume.mock.calls[0]?.[0]).toMatchObject({ bucket: "password_reset_code_ip" });
  });
});

describe("the session a right code makes", () => {
  /* GoTrue records a verified recovery code as `recovery`; an emailed OTP
     sign-in as `otp`. Either, fresh, is the proof the gate accepts. */
  for (const method of ["recovery", "otp"]) {
    it(`sets a new password without the old one when its amr is ${method}`, async () => {
      seam.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method, timestamp: nowSeconds() - 5 }] } } });
      const { updatePassword } = await import("./actions");
      await expect(updatePassword({ ok: false }, passwordForm("a-new-password-1"))).rejects.toThrow("REDIRECT:/home");
      expect(seam.reauthenticate).not.toHaveBeenCalled();
      expect(seam.updateUser).toHaveBeenCalledWith({ password: "a-new-password-1" });
    });
  }

  it("no longer does after the half hour, and asks for the current password", async () => {
    seam.getClaims.mockResolvedValue({
      data: { claims: { amr: [{ method: "recovery", timestamp: nowSeconds() - 31 * 60 }] } },
    });
    const { updatePassword } = await import("./actions");
    const state = await updatePassword({ ok: false }, passwordForm("a-new-password-2"));
    expect(state.fieldErrors?.currentPassword).toBeTruthy();
    expect(seam.updateUser).not.toHaveBeenCalled();
  });

  it("is what passwordChangeProof reads as needing nothing more", async () => {
    seam.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "recovery", timestamp: nowSeconds() }] } } });
    const { passwordChangeProof } = await import("./password-change-proof");
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) throw new Error("the mocked session has no user");
    expect(await passwordChangeProof(supabase, user)).toBe("none");
  });
});
