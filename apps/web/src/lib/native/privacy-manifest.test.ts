import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/* C15: the app target's privacy manifest exists, is bundled, and says what
   docs/store/PRIVACY_LABELS.md says. */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = readFileSync(`${root}ios/App/App/PrivacyInfo.xcprivacy`, "utf8").replace(/<!--[\s\S]*?-->/g, "");
const pbxproj = readFileSync(`${root}ios/App/App.xcodeproj/project.pbxproj`, "utf8");

describe("the iOS privacy manifest (C15)", () => {
  it("is in the app target's resources", () => {
    expect(pbxproj).toMatch(/PrivacyInfo\.xcprivacy in Resources \*\/ = \{isa = PBXBuildFile/);
    expect(pbxproj).toMatch(/\/\* PrivacyInfo\.xcprivacy in Resources \*\/,\n\t\t\t\);/);
  });

  it("declares no tracking and no tracking domains", () => {
    expect(manifest).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(manifest).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
  });

  it("lists the collected types the store answers name, and not crash data while Sentry is off", () => {
    for (const type of ["EmailAddress", "PreciseLocation", "PhotosorVideos", "DeviceID", "ProductInteraction", "PerformanceData"]) {
      expect(manifest).toContain(`NSPrivacyCollectedDataType${type}<`);
    }
    expect(manifest).not.toContain("NSPrivacyCollectedDataTypeCrashData");
  });
});
