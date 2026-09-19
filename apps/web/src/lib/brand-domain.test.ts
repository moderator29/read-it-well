import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { BRAND_DOMAIN, BRAND_ORIGIN } from "./brand-domain";

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
   * a grep is the only thing that can hold that line as the copy grows.
   */
  it("keeps the private address off every public surface", () => {
    for (const path of [
      "apps/web/src/lib/email/client.ts",
      "apps/web/src/lib/support-email.ts",
      "apps/web/src/lib/brand-domain.ts",
    ]) {
      expect(read(path), `${path} names the private address`).not.toContain("vallospacesltd@gmail.com");
    }
  });
});
