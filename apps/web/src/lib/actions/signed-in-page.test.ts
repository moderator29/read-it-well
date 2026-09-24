import { beforeEach, describe, expect, it, vi } from "vitest";

/** SUP-04: the page-level gate the proxy's form allow-list relies on. */
const seam = vi.hoisted(() => ({ state: "signed-out" as string, redirect: vi.fn() }));

vi.mock("./session", () => ({ resolveSession: async () => ({ state: seam.state }) }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    seam.redirect(to);
    throw new Error("NEXT_REDIRECT");
  },
}));

const { requireSignedInPage } = await import("./signed-in-page");

beforeEach(() => seam.redirect.mockReset());

describe("requireSignedInPage (SUP-04)", () => {
  it("sends a signed-out render to sign in, back to the same page", async () => {
    seam.state = "signed-out";
    await expect(requireSignedInPage("/profile/setup/owner")).rejects.toThrow("NEXT_REDIRECT");
    expect(seam.redirect).toHaveBeenCalledWith("/sign-in?next=%2Fprofile%2Fsetup%2Fowner&notice=sign-in-required");
  });

  it.each(["signed-in", "unconfigured"])("lets a %s render through", async (state) => {
    seam.state = state;
    await expect(requireSignedInPage("/profile/setup/owner")).resolves.toBeUndefined();
    expect(seam.redirect).not.toHaveBeenCalled();
  });
});
