import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import config from "../../../capacitor.config";
import { signedOutStart } from "@/lib/catalogue/public-access";

/**
 * STORE-04: the app opens on `/open`, never on the marketing page, and the
 * iOS shell can actually start there.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const startPath = (JSON.parse(readFileSync(`${root}native-shell/start-path.json`, "utf8")) as { startPath: string }).startPath;

describe("where the native app opens", () => {
  it("is /open, not /", () => {
    expect(startPath).toBe("/open");
  });

  it("is what capacitor.config hands the shell when an origin is set", async () => {
    const previous = process.env.CAPACITOR_SERVER_URL;
    process.env.CAPACITOR_SERVER_URL = "https://www.vallospaces.com";
    try {
      const { vi } = await import("vitest");
      vi.resetModules();
      const fresh = (await import("../../../capacitor.config")).default;
      expect(fresh.server?.appStartPath).toBe(startPath);
      expect(fresh.server?.errorPath).toBe("index.html");
    } finally {
      if (previous === undefined) delete process.env.CAPACITOR_SERVER_URL;
      else process.env.CAPACITOR_SERVER_URL = previous;
    }
    expect(config.appId).toBe("com.vallospaces.app");
  });

  it("exists inside webDir, which iOS checks before loading the server URL", () => {
    expect(existsSync(`${root}native-shell${startPath}/index.html`)).toBe(true);
  });

  it("the offline card retries the same path", () => {
    const shellConfig = readFileSync(`${root}native-shell/shell-config.js`, "utf8");
    expect(shellConfig).toContain(`window.__VALLO_START_PATH__ = "${startPath}";`);
  });

  it("sends a stranger to the welcome, or to the catalogue when the founder opens it", () => {
    expect(signedOutStart({})).toBe("/welcome");
    expect(signedOutStart({ VALLO_PUBLIC_CATALOGUE: "on" })).toBe("/search");
  });
});
