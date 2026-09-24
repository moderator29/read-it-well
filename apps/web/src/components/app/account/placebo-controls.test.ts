import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import { SETTINGS_DEFAULTS } from "./settings-store";

/**
 * UX-P2-01 / UX-P2-02: a control that does nothing is a claim. "Download my
 * data" downloaded nothing and said everything Vallo knows lives in this
 * browser; "Biometric app lock" saved a preference nothing read; "Sign out
 * everywhere" said this was the only session. None may come back until the
 * mechanism behind it exists (the real export is OPS-12; ending sessions is
 * /settings/devices).
 */
const groups = withoutComments(
  readFileSync(join(process.cwd(), "src/components/app/account/SettingsGroups.tsx"), "utf8"),
);

describe("no placebo controls on the privacy and security screen", () => {
  it("draws no app-lock switch, no download button and no fake sign-out-everywhere", () => {
    expect(groups).not.toMatch(/appLock|copy\.download|exportNote|signOutEverywhere|signOutNote/);
  });

  it("stores no app-lock preference that nothing reads", () => {
    expect(Object.keys(SETTINGS_DEFAULTS)).not.toContain("appLock");
  });

  it.each(["en", "ha", "ig", "yo"] as const)("the %s dictionary carries none of their copy", (locale) => {
    const t = getDictionary(locale) as unknown as {
      settings: { security: Record<string, unknown>; data: Record<string, unknown> };
    };
    for (const key of ["appLock", "appLockSub", "signOutEverywhere", "signOutNote"]) {
      expect(t.settings.security[key]).toBeUndefined();
    }
    for (const key of ["download", "downloadSub", "exportNote"]) {
      expect(t.settings.data[key]).toBeUndefined();
    }
  });
});
