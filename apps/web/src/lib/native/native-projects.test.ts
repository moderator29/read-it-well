import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Native release audit, 28 September 2026. No Xcode and no Android SDK run in
 * this repository's CI, so two defects that a first native build would have
 * caught were found by reading instead. These tests hold both fixes against
 * the Capacitor source actually installed, so an upgrade that renames a
 * symbol fails here rather than in somebody's first archive.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const stripXmlComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, "");
const stripSwiftComments = (text: string) => text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("iOS AppDelegate compiles against the installed Capacitor", () => {
  const delegate = stripSwiftComments(readFileSync(`${root}ios/App/App/AppDelegate.swift`, "utf8"));
  const capNotifications = `${repo}node_modules/@capacitor/ios/Capacitor/Capacitor/CAPNotifications.swift`;

  it("every capacitor* notification name it posts is defined by Capacitor", () => {
    expect(existsSync(capNotifications)).toBe(true);
    const defined = new Set(
      [...readFileSync(capNotifications, "utf8").matchAll(/static let (capacitor\w+)/g)].map((m) => m[1]),
    );
    const used = [...delegate.matchAll(/\.(capacitor[A-Z]\w+)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(defined, `Notification.Name.${name}`).toContain(name);
  });

  it("does not claim the notification centre delegate that Capacitor's NotificationRouter owns", () => {
    expect(delegate).not.toMatch(/UNUserNotificationCenter\.current\(\)\.delegate\s*=/);
    expect(delegate).not.toMatch(/UNUserNotificationCenterDelegate/);
  });
});

describe("Android manifest: FCM defaults are application metadata", () => {
  const manifest = stripXmlComments(
    readFileSync(`${root}android/app/src/main/AndroidManifest.xml`, "utf8"),
  );

  it("no FCM meta-data sits inside a provider, activity, service or receiver", () => {
    const nested = manifest.match(/<(provider|activity|service|receiver)\b[\s\S]*?<\/\1>/g) ?? [];
    for (const block of nested) expect(block).not.toContain("com.google.firebase.messaging");
  });

  it("declares the default channel the server sends on", () => {
    expect(manifest).toContain('android:name="com.google.firebase.messaging.default_notification_channel_id"');
    expect(manifest).toContain('android:value="vallo_default"');
  });

  it("excludes the session cookie jar from backup and device transfer", () => {
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:dataExtractionRules="@xml/data_extraction_rules"');
    const rules = readFileSync(`${root}android/app/src/main/res/xml/data_extraction_rules.xml`, "utf8");
    expect(rules).toMatch(/<device-transfer>[\s\S]*domain="root"[\s\S]*<\/device-transfer>/);
    expect(rules).toMatch(/<cloud-backup>[\s\S]*domain="root"[\s\S]*<\/cloud-backup>/);
  });
});
