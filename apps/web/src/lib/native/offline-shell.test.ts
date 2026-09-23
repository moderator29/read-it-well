import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

/**
 * STORE-01. The packaged offline card: what it says and where "Try again" goes.
 *
 * It decided "this build has no server" by calling `window.Capacitor.getConfig`,
 * which Capacitor 8 does not have, so every shipping build showed a developer
 * card telling the reader to set CAPACITOR_SERVER_URL, and its button reloaded
 * the packaged page rather than the live origin.
 */
const shellDir = fileURLToPath(new URL("../../../native-shell/", import.meta.url));
const html = readFileSync(`${shellDir}index.html`, "utf8");
const shellJs = readFileSync(`${shellDir}shell.js`, "utf8");
const shellConfig = readFileSync(`${shellDir}shell-config.js`, "utf8");

function visibleText(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

describe("the card is ours, not a developer's", () => {
  it("names no build variable, command or document", () => {
    const text = visibleText(html);
    expect(text).not.toMatch(/CAPACITOR_SERVER_URL|cap sync|docs\/MOBILE|This build has no server|Reload the shell/);
  });

  it("uses no window.Capacitor member that Capacitor 8 does not define", () => {
    const require = createRequire(import.meta.url);
    const definitions = readFileSync(require.resolve("@capacitor/core/types/definitions-internal.d.ts"), "utf8");
    const code = (source: string) =>
      source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    for (const source of [code(html), code(shellJs)]) {
      const used = [...source.matchAll(/Capacitor\.(\w+)/g)].map((match) => match[1]);
      for (const member of used) expect(definitions).toContain(`${member}`);
      expect(source).not.toContain("getConfig");
    }
  });

  it("loads the written origin before the behaviour, and the committed origin is production https", () => {
    expect(html.indexOf('src="shell-config.js"')).toBeGreaterThan(-1);
    expect(html.indexOf('src="shell-config.js"')).toBeLessThan(html.indexOf('src="shell.js"'));
    expect(shellConfig).toMatch(/__VALLO_ORIGIN__ = "https:\/\/www\.vallospaces\.com";/);
  });
});

type Listener = () => void;

function run(options: { origin?: string; startPath?: string; reachable?: boolean }) {
  const listeners: Record<string, Listener[]> = {};
  const elements: Record<string, { hidden: boolean; attrs: Record<string, string>; click?: Listener }> = {
    retry: { hidden: false, attrs: {} },
    still: { hidden: true, attrs: {} },
  };
  const replace = vi.fn();
  const fetch = vi.fn(() => (options.reachable ? Promise.resolve({}) : Promise.reject(new TypeError("offline"))));
  const body = { attrs: {} as Record<string, string>, setAttribute(name: string, value: string) { this.attrs[name] = value; } };
  const win: Record<string, unknown> = {
    __VALLO_ORIGIN__: options.origin,
    __VALLO_START_PATH__: options.startPath,
    location: { replace, reload: vi.fn() },
    fetch,
    addEventListener: (name: string, fn: Listener) => void (listeners[name] ??= []).push(fn),
    document: {
      body,
      getElementById: (id: string) => {
        const element = elements[id];
        if (!element) return null;
        return {
          get hidden() { return element.hidden; },
          set hidden(value: boolean) { element.hidden = value; },
          setAttribute: (name: string, value: string) => void (element.attrs[name] = value),
          removeAttribute: (name: string) => void delete element.attrs[name],
          addEventListener: (_name: string, fn: Listener) => void (element.click = fn),
        };
      },
    },
  };
  win.window = win;
  vm.runInNewContext(shellJs, { window: win });
  return { win, body, elements, listeners, replace, fetch };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Try again retries the live origin", () => {
  it("goes to the origin's start path when the origin answers", async () => {
    const shell = run({ origin: "https://www.vallospaces.com", startPath: "/welcome", reachable: true });
    shell.elements.retry!.click?.();
    await settle();
    expect(shell.fetch).toHaveBeenCalledTimes(1);
    expect(shell.replace).toHaveBeenCalledWith("https://www.vallospaces.com/welcome");
  });

  it("stays and says so when the origin still cannot be reached", async () => {
    const shell = run({ origin: "https://www.vallospaces.com", reachable: false });
    shell.elements.retry!.click?.();
    await settle();
    expect(shell.replace).not.toHaveBeenCalled();
    expect(shell.elements.still!.hidden).toBe(false);
  });

  it("retries by itself when the connection comes back", async () => {
    const shell = run({ origin: "https://www.vallospaces.com", reachable: true });
    for (const fn of shell.listeners.online ?? []) fn();
    await settle();
    expect(shell.replace).toHaveBeenCalledWith("https://www.vallospaces.com/");
  });

  it("shows the needs-updating card only when the build carries no origin", () => {
    expect(run({}).body.attrs["data-state"]).toBe("unconfigured");
    expect(run({ origin: "http://insecure.example" }).body.attrs["data-state"]).toBe("unconfigured");
    expect(run({ origin: "https://www.vallospaces.com" }).body.attrs["data-state"]).toBeUndefined();
  });
});
