import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BRAND_DOMAIN, BRAND_ORIGIN } from "./brand-domain";
import { PRIVATE_ADDRESS } from "./security/private-address";

/**
 * THE DOMAIN CANNOT DRIFT AGAIN.
 *
 * `BRAND_DOMAIN` is the single source of truth, and TypeScript keeps every
 * importer honest. The files below are NOT TypeScript: the Android manifest
 * and the iOS entitlements declare the host in their own syntax, nothing
 * imports them, and nothing checks them. That is how the product came to be
 * built around `vallo.ng`, a domain nobody had registered, while production
 * served somewhere else entirely.
 *
 * It matters more than a stale string usually would, because Android App
 * Links and iOS Universal Links both verify by EXACT HOST. A mismatch does
 * not warn, does not degrade and does not fail loudly: every shared Vallo
 * link simply opens a browser instead of the app, for ever, and the only way
 * anybody finds out is by noticing that nobody ever arrives in the app from a
 * link. This test is the alarm that was missing.
 */

const REPO = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(REPO, p), "utf8");

/** Every file under `dir`, whatever its extension. */
function filesUnder(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") filesUnder(path, out);
    } else {
      out.push(path);
    }
  }
  return out;
}

describe("the brand domain, and the native files that must agree with it", () => {
  it("is a bare host with no scheme, no path and no trailing dot", () => {
    expect(BRAND_DOMAIN).not.toContain("/");
    expect(BRAND_DOMAIN).not.toContain(":");
    expect(BRAND_DOMAIN).not.toMatch(/\.$/);
    expect(BRAND_DOMAIN).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
  });

  it("builds its origin from itself, so the two can never disagree", () => {
    expect(BRAND_ORIGIN).toBe(`https://${BRAND_DOMAIN}`);
  });

  it("is the host the Android manifest verifies, apex and www", () => {
    const manifest = read("apps/web/android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain(`android:host="${BRAND_DOMAIN}"`);
    expect(manifest).toContain(`android:host="www.${BRAND_DOMAIN}"`);
  });

  it("is the host the iOS entitlements claim, apex and www", () => {
    const entitlements = read("apps/web/ios/App/App/App.entitlements");
    expect(entitlements).toContain(`applinks:${BRAND_DOMAIN}`);
    expect(entitlements).toContain(`applinks:www.${BRAND_DOMAIN}`);
  });

  it("leaves no trace of the domain that was never registered", () => {
    for (const path of [
      "apps/web/android/app/src/main/AndroidManifest.xml",
      "apps/web/ios/App/App/App.entitlements",
      "apps/web/src/lib/brand-domain.ts",
      "apps/web/src/lib/email/client.ts",
      "apps/web/src/lib/support-email.ts",
    ]) {
      expect(read(path), `${path} still carries the dropped domain`).not.toContain("vallo.ng");
    }
  });

  /*
   * The founder's private address exists for the bank and the regulators. It
   * must never reach a public surface, a legal document or any app copy, and
   * a scan is the only thing that can hold that line as the copy grows.
   *
   * SEC-11: the guard used to look for one spelling in three files, and the
   * real address is the OTHER spelling. It now matches both spellings
   * (`PRIVATE_ADDRESS`) in every file under apps/web/src and every email
   * template (supabase/templates). Neither spelling is written out anywhere in
   * this repository, this file included.
   */
  it("keeps the private address, in either spelling, out of every source file and email template", () => {
    const files = [
      ...filesUnder(join(REPO, "apps/web/src")),
      ...filesUnder(join(REPO, "supabase/templates")),
    ];
    expect(files.length).toBeGreaterThan(1000);
    const carrying = files.filter((file) => PRIVATE_ADDRESS.test(readFileSync(file, "utf8")));
    expect(carrying).toEqual([]);
  });

  it("the guard matches both spellings and nothing else", () => {
    const at = "@" + "gmail.com";
    expect(PRIVATE_ADDRESS.test(`vallospaces${"ltd"}${at}`)).toBe(true);
    expect(PRIVATE_ADDRESS.test(`vallospace${"ltd"}${at}`)).toBe(true);
    expect(PRIVATE_ADDRESS.test("VALLOSPACESLTD" + at)).toBe(true);
    expect(PRIVATE_ADDRESS.test("hello@vallospaces.com")).toBe(false);
    expect(PRIVATE_ADDRESS.test("support@vallospaces.com")).toBe(false);
  });
});

/**
 * THE BUNDLE IDENTIFIER, WHICH IS THE ONE STRING IN THIS PRODUCT THAT CAN
 * NEVER BE CORRECTED.
 *
 * A domain can be repointed and a typo in copy can be fixed in an afternoon.
 * A bundle identifier is fixed at first submission: Google Play will not
 * change it at all once an app record exists, and Apple treats a change as a
 * different app. There is no migration and no support case that undoes it.
 *
 * It has already been wrong twice. `docs/MOBILE.md` reserved `ng.rentme.app`,
 * the name from before the rename, until 19 September. The code then carried
 * `ng.vallo.app`, reverse DNS of a domain that was never registered and has
 * since been dropped entirely. It is now `com.vallospaces.app`, reverse DNS
 * of the domain the company actually owns, changed on the founder's word and
 * only because no store record exists on either platform yet.
 *
 * Seven files carry it, in five different syntaxes, and not one of them is
 * TypeScript, so nothing but this test can notice when they stop agreeing.
 * The failure mode of a mismatch is not a build error: Gradle will happily
 * build a package whose `applicationId` disagrees with `assetlinks.json`, and
 * the only symptom is that Android App Links silently stop verifying and
 * every shared link opens a browser for ever.
 */
describe("the native bundle identifier, which cannot be corrected after first submission", () => {
  const BUNDLE = "com.vallospaces.app";

  it("is the Android namespace and applicationId", () => {
    const gradle = read("apps/web/android/app/build.gradle");
    expect(gradle).toContain(`namespace = "${BUNDLE}"`);
    expect(gradle).toContain(`applicationId "${BUNDLE}"`);
  });

  it("is the Java package, and the file sits at the path that package names", () => {
    /*
     * Both halves, because they fail independently and only one of them is
     * loud. A `package` line that disagrees with its directory is a compile
     * error, so it gets caught; a directory left behind after a rename is
     * silent dead weight that the next person reads as the real one.
     */
    const dir = BUNDLE.split(".").join("/");
    const activity = read(`apps/web/android/app/src/main/java/${dir}/MainActivity.java`);
    expect(activity).toContain(`package ${BUNDLE};`);
  });

  it("is the package name and the custom scheme in strings.xml", () => {
    const strings = read("apps/web/android/app/src/main/res/values/strings.xml");
    expect(strings).toContain(`<string name="package_name">${BUNDLE}</string>`);
    expect(strings).toContain(`<string name="custom_url_scheme">${BUNDLE}</string>`);
  });

  it("is the Capacitor appId, which is what generates the native projects", () => {
    expect(read("apps/web/capacitor.config.ts")).toContain(`appId: "${BUNDLE}"`);
  });

  it("is the iOS product bundle identifier in every build configuration", () => {
    /*
     * Every configuration, not the first one found. Debug and Release each
     * carry their own line, and a rename that caught only one produces an app
     * whose TestFlight build and App Store build are different apps.
     */
    const pbxproj = read("apps/web/ios/App/App.xcodeproj/project.pbxproj");
    const lines = pbxproj.split("\n").filter((line) => line.includes("PRODUCT_BUNDLE_IDENTIFIER"));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line, "an iOS build configuration carries a different bundle id").toContain(BUNDLE);
    }
  });

  it("is the package Android App Links are signed for", () => {
    const assetlinks = read("apps/web/public/.well-known/assetlinks.json");
    expect(assetlinks).toContain(`"package_name": "${BUNDLE}"`);
  });

  it("is the app the Apple App Site Association names, behind the team id", () => {
    const aasa = read("apps/web/public/.well-known/apple-app-site-association");
    expect(aasa).toContain(`.${BUNDLE}"`);
  });

  it("leaves no trace of either identifier it used to be", () => {
    for (const path of [
      "apps/web/android/app/build.gradle",
      "apps/web/android/app/src/main/AndroidManifest.xml",
      "apps/web/android/app/src/main/res/values/strings.xml",
      "apps/web/capacitor.config.ts",
      "apps/web/ios/App/App.xcodeproj/project.pbxproj",
      "apps/web/ios/App/App/App.entitlements",
      "apps/web/public/.well-known/assetlinks.json",
      "apps/web/public/.well-known/apple-app-site-association",
    ]) {
      const body = read(path);
      expect(body, `${path} still carries ng.vallo.app`).not.toContain("ng.vallo.app");
      expect(body, `${path} still carries ng.rentme.app`).not.toContain("ng.rentme.app");
    }
  });
});
