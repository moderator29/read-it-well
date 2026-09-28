import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * F-01: the native shell loads the www host. The apex 308-redirects to www, and
 * a `server.url` that redirects to another host can send the first launch to
 * the system browser.
 */
const root = fileURLToPath(new URL("../../../", import.meta.url));
const previous = process.env.CAPACITOR_SERVER_URL;

async function configWith(value: string | undefined) {
  if (value === undefined) delete process.env.CAPACITOR_SERVER_URL;
  else process.env.CAPACITOR_SERVER_URL = value;
  vi.resetModules();
  return (await import("../../../capacitor.config")).default;
}

afterEach(() => {
  if (previous === undefined) delete process.env.CAPACITOR_SERVER_URL;
  else process.env.CAPACITOR_SERVER_URL = previous;
});

describe("the origin the native shell loads", () => {
  it("is the www host when the documented value is used", async () => {
    const config = await configWith("https://www.vallospaces.com");
    expect(new URL(config.server?.url ?? "").host).toBe("www.vallospaces.com");
  });

  it("rewrites the apex, which only redirects, to the www host", async () => {
    const config = await configWith("https://vallospaces.com/");
    expect(new URL(config.server?.url ?? "").host).toBe("www.vallospaces.com");
  });

  it("lets both production hosts navigate inside the web view", async () => {
    const config = await configWith("https://www.vallospaces.com");
    expect(config.server?.allowNavigation).toEqual(
      expect.arrayContaining(["www.vallospaces.com", "vallospaces.com"]),
    );
  });

  it("still omits the server block when the variable is unset", async () => {
    const config = await configWith(undefined);
    expect(config.server).toBeUndefined();
  });

  it("is what the packaged offline card retries", () => {
    const shellConfig = readFileSync(`${root}native-shell/shell-config.js`, "utf8");
    expect(shellConfig).toContain('window.__VALLO_ORIGIN__ = "https://www.vallospaces.com";');
  });

  it("is the www host everywhere the docs tell the owner what to set", () => {
    for (const file of ["../../docs/MOBILE.md", "../../README.md", "../../scripts/sync-native-versions.mjs"]) {
      const text = readFileSync(`${root}${file}`, "utf8");
      expect(text, file).not.toMatch(/CAPACITOR_SERVER_URL="?https:\/\/vallospaces\.com/);
    }
  });
});
