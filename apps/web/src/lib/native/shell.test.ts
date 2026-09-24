import { describe, expect, it } from "vitest";
import { isShellRequest, isShellUserAgent, shellStartPath, SHELL_START, SHELL_UA_MARK } from "./shell";

const IOS_SHELL =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ValloShell";
const ANDROID_SHELL =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0 Mobile Safari/537.36 ValloShell";
const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const WHATSAPP = "WhatsApp/2.24.1 A";

describe("the app never opens on the website", () => {
  it("never answers `/` or any marketing page as the shell's start", () => {
    for (const signedIn of [true, false]) {
      for (const firstRunSeen of [true, false]) {
        const path = shellStartPath({ signedIn, firstRunSeen });
        expect(path).not.toBe("/");
        expect(["/home", "/welcome", "/sign-in"]).toContain(path);
      }
    }
  });

  it("opens a signed-in member on home, a new device on welcome, a returning one on sign in", () => {
    expect(shellStartPath({ signedIn: true, firstRunSeen: false })).toBe("/home");
    expect(shellStartPath({ signedIn: false, firstRunSeen: false })).toBe("/welcome");
    expect(shellStartPath({ signedIn: false, firstRunSeen: true })).toBe("/sign-in");
  });

  it("recognises the shell on both platforms and nothing else", () => {
    expect(isShellUserAgent(IOS_SHELL)).toBe(true);
    expect(isShellUserAgent(ANDROID_SHELL)).toBe(true);
    expect(isShellUserAgent(SAFARI)).toBe(false);
    expect(isShellUserAgent(WHATSAPP)).toBe(false);
    expect(isShellUserAgent(null)).toBe(false);
  });

  it("treats app=1 as the explicit form of the same request", () => {
    expect(isShellRequest({ userAgent: SAFARI, app: "1" })).toBe(true);
    expect(isShellRequest({ userAgent: SAFARI, app: null })).toBe(false);
    expect(isShellRequest({ userAgent: IOS_SHELL })).toBe(true);
  });

  it("is the mark the native config appends, and the start the landing sends it to", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const config = readFileSync(join(__dirname, "..", "..", "..", "capacitor.config.ts"), "utf8");
    expect(config).toContain(`appendUserAgent: "${SHELL_UA_MARK}"`);
    expect(SHELL_START).toBe("/home-or-landing?app=1");
  });
});
