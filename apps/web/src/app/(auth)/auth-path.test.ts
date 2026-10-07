import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitLocalePrefix } from "@/lib/i18n/public-locale";
import { groundForPath } from "@/components/auth/ground";
import { isNightDoorPath } from "@/lib/theme/night-door";

/**
 * The auth chrome reads the screen's path WITHOUT the language prefix
 * (`useAuthPath`, U1). Measured in a production build before: on
 * /yo/sign-up/verify the bowl said "Welcome back! Sign in to continue." over
 * the sign-in tower, the way back was missing and the sign-up flow lost its
 * night door, in Hausa, Igbo and Yoruba alike.
 */
const PIECES = ["AuthBackBar.tsx", "AuthFocal.tsx", "AuthGround.tsx", "AuthHeroLine.tsx", "AuthMain.tsx"];

describe("the auth chrome under a language prefix", () => {
  it("reads the same screen at /yo/sign-up/verify as at /sign-up/verify", () => {
    for (const prefix of ["", "/ha", "/ig", "/yo"]) {
      const path = splitLocalePrefix(`${prefix}/sign-up/verify`).path;
      expect(path).toBe("/sign-up/verify");
      expect(groundForPath(path).name).toBe(groundForPath("/sign-up/verify").name);
      expect(isNightDoorPath(path)).toBe(true);
    }
  });

  it("is read through useAuthPath by every piece that looks at the path", () => {
    for (const piece of PIECES) {
      const src = readFileSync(join(__dirname, piece), "utf8");
      expect(src, piece).toContain("useAuthPath()");
      expect(src, piece).not.toContain("usePathname");
    }
  });
});
