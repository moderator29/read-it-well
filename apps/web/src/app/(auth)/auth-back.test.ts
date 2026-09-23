import { describe, expect, it } from "vitest";
import { isAppRoot, parentOf } from "@/lib/nav/resolve";

/*
 * The auth screens' back control (`AuthBackBar`) draws when, and only when,
 * `parentOf` answers "parent". This holds that every screen in the group has
 * one and that none of them is an app root, which is what Android's hardware
 * back asks before it closes the app.
 */
const EXPECTED: Record<string, string> = {
  "/sign-in": "/welcome",
  "/sign-in/email": "/sign-in",
  "/sign-up": "/welcome",
  "/sign-up/email": "/sign-up",
  "/sign-up/verify": "/sign-up/email",
  "/forgot-password": "/sign-in",
  "/reset-password": "/sign-in",
  "/auth/callback": "/sign-in",
};

describe("auth routes resolve a back target", () => {
  for (const [route, parent] of Object.entries(EXPECTED)) {
    it(`${route} goes back to ${parent}`, () => {
      const target = parentOf(route);
      expect(target.kind).toBe("parent");
      if (target.kind === "parent") expect(target.href).toBe(parent);
      expect(isAppRoot(route)).toBe(false);
    });
  }

  it("sign in never heads towards sign up", () => {
    const target = parentOf("/sign-in");
    expect(target.kind === "parent" && target.href.includes("sign-up")).toBe(false);
  });
});
