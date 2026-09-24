import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AML-19. The kill-switch console can close held payments but never open
 * them: opening takes two super admins in the database.
 */
const seam = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./guard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./guard")>()),
  requireAdmin: async () => ({ state: "admin", user: { id: "sa-1" }, supabase: { from: seam.from } }),
}));

const { toggleFeatureFlag } = await import("./actions");

beforeEach(() => seam.from.mockReset());

describe("toggleFeatureFlag and held payments (AML-19)", () => {
  it("refuses to open held payments from one console, without touching the database", async () => {
    const result = await toggleFeatureFlag({ key: "held_payments", enabled: true });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error).toMatch(/two super admins/);
    expect(seam.from).not.toHaveBeenCalled();
  });

  it("still lets the console close held payments", async () => {
    seam.from.mockImplementation(() => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: { key: "held_payments", enabled: true, note: null }, error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
      };
      return chain;
    });
    await toggleFeatureFlag({ key: "held_payments", enabled: false });
    expect(seam.from).toHaveBeenCalledWith("feature_flags");
  });
});
