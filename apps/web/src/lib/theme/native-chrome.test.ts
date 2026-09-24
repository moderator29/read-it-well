import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { CHROME_COLOUR } from "./chrome";

/**
 * STORE-18: the native shell's first paint and launcher icon agree with the
 * app's chrome.
 */
const WEB = process.cwd();
const read = (path: string) => readFileSync(join(WEB, path), "utf8");

describe("the native shell's chrome", () => {
  it("paints the same status-bar colour as the app and the splash", () => {
    const shell = read("native-shell/index.html");
    expect(shell).toMatch(new RegExp(`<meta name="theme-color" content="${CHROME_COLOUR}"`));
    const config = read("capacitor.config.ts");
    expect(config).toContain(`backgroundColor: "${CHROME_COLOUR}"`);
  });

  it.each(["ic_launcher", "ic_launcher_round"])(
    "draws the %s adaptive background full bleed",
    (name) => {
      const xml = read(`android/app/src/main/res/mipmap-anydpi-v26/${name}.xml`);
      const background = xml.slice(xml.indexOf("<background"), xml.indexOf("<foreground"));
      expect(background).toContain('android:drawable="@mipmap/ic_launcher_background"');
      expect(background).not.toContain("<inset");
    },
  );
});
