import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { VIDEO_MIME_TYPES } from "@/lib/agent/listings-schema";

/**
 * STORE-P2-03 and STORE-13, read from the iOS project the binary is built
 * from. No Xcode runs in CI, so these files are the only place to hold it.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const plist = readFileSync(`${root}ios/App/App/Info.plist`, "utf8").replace(/<!--[\s\S]*?-->/g, "");
const pbxproj = readFileSync(`${root}ios/App/App.xcodeproj/project.pbxproj`, "utf8");
const walkthrough = readFileSync(`${root}src/components/agent/VideoWalkthrough.tsx`, "utf8");

function plistString(key: string): string | null {
  const match = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return match ? match[1]! : null;
}

describe("STORE-P2-03: a video picker needs a microphone string and an honest camera string", () => {
  it("the walkthrough upload does accept video, which is why this matters", () => {
    expect(walkthrough).toContain("accept={VIDEO_MIME_TYPES.join");
    expect(VIDEO_MIME_TYPES.some((type) => type.startsWith("video/"))).toBe(true);
  });

  it("declares why the microphone is used", () => {
    const microphone = plistString("NSMicrophoneUsageDescription");
    expect(microphone).not.toBeNull();
    expect(microphone!.length).toBeGreaterThan(40);
    expect(microphone).toMatch(/video/i);
  });

  it("the camera string no longer promises that video is never recorded", () => {
    const camera = plistString("NSCameraUsageDescription");
    expect(camera).not.toBeNull();
    expect(camera).not.toMatch(/never records video/i);
    expect(camera).toMatch(/video/i);
  });
});

describe("STORE-13: iPhone only for v1", () => {
  it("every build configuration targets the iPhone family alone", () => {
    const families = [...pbxproj.matchAll(/TARGETED_DEVICE_FAMILY = ("?[\d,]+"?);/g)].map((match) => match[1]);
    expect(families.length).toBeGreaterThan(0);
    for (const family of families) expect(family).toBe("1");
  });

  it("declares no iPad orientations", () => {
    expect(plist).not.toContain("UISupportedInterfaceOrientations~ipad");
  });
});
