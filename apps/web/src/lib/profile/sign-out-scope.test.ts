import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * SEC-08: "Log out" ends THIS device's session only; ending every device is a
 * separate, explicit action. supabase-js defaults `signOut()` to
 * `scope: 'global'`, which used to throw every other device out as well.
 */
const seam = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
});
