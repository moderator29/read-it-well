import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-08: "Log out" ends THIS device's session only; ending every device is a
 * separate, explicit action. supabase-js defaults `signOut()` to
 * `scope: 'global'`, which used to throw every other device out as well.
 */
const seam = vi.hoisted(() => ({ signOut: vi.fn(), revoke: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../push/revoke", () => ({
  isDeviceRef: (value: unknown) => typeof value === "string" && /^[0-9a-f]{12}$/.test(value),
  revokeTokens: seam.revoke,
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => ({
    state: "signed-in",
    user: { id: "957b3bd2-cce3-425d-bba9-5cd876ca3d62" },
    supabase: { auth: { signOut: seam.signOut } },
  }),
}));

beforeEach(() => {
  seam.signOut.mockReset();
  seam.signOut.mockResolvedValue({ error: null });
  seam.revoke.mockReset();
  seam.revoke.mockResolvedValue({ ok: true, revoked: 1 });
});

describe("signing out", () => {
  it("ends only this device's session", async () => {
    const { signOut } = await import("./actions");
    const result = await signOut();
    expect(result.ok).toBe(true);
    expect(seam.signOut).toHaveBeenCalledTimes(1);
    expect(seam.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("ends every device only when asked to, explicitly", async () => {
    const { signOutEverywhere } = await import("./actions");
    const result = await signOutEverywhere();
    expect(result.ok).toBe(true);
    expect(seam.signOut).toHaveBeenCalledWith({ scope: "global" });
  });

  it("says so when the provider refuses", async () => {
    seam.signOut.mockResolvedValue({ error: { message: "network" } });
    const { signOut } = await import("./actions");
    const result = await signOut();
    expect(result.ok).toBe(false);
  });

  it("retires this device's push row, and only by its ref, under the session's user", async () => {
    const { signOut } = await import("./actions");
    await signOut("0123456789ab");
    expect(seam.revoke).toHaveBeenCalledWith("957b3bd2-cce3-425d-bba9-5cd876ca3d62", {
      deviceRef: "0123456789ab",
    });
    expect(seam.revoke.mock.invocationCallOrder[0]).toBeLessThan(seam.signOut.mock.invocationCallOrder[0]!);
  });

  it("touches no push row when no well-formed ref is given", async () => {
    const { signOut } = await import("./actions");
    await signOut();
    await signOut("not-a-ref'; drop");
    expect(seam.revoke).not.toHaveBeenCalled();
  });

  it("retires every device when signing out everywhere", async () => {
    const { signOutEverywhere } = await import("./actions");
    await signOutEverywhere();
    expect(seam.revoke).toHaveBeenCalledWith("957b3bd2-cce3-425d-bba9-5cd876ca3d62", { all: true });
  });

  it("still signs out when the revoke throws", async () => {
    seam.revoke.mockRejectedValue(new Error("db down"));
    const { signOut } = await import("./actions");
    const result = await signOut("0123456789ab");
    expect(result.ok).toBe(true);
    expect(seam.signOut).toHaveBeenCalled();
  });
});
