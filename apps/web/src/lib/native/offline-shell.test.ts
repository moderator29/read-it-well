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
    /* A screen with no network cannot know the state of anything, so it
       promises nothing about it. */
    expect(text).not.toMatch(/\bis safe\b|nothing (has been|was) lost|where you left it/i);
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

function run(options: { origin?: string; startPath?: string; reachable?: boolean; capacitor?: unknown }) {
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
    Capacitor: options.capacitor,
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

describe("the offline card takes the splash down itself", () => {
  /* launchAutoHide is false and the live app is what normally hides the
     splash, so an unreachable origin left the splash up over this card. */
  it("asks the injected bridge to hide it, whether or not the build has an origin", () => {
    for (const origin of ["https://www.vallospaces.com", undefined]) {
      const nativePromise = vi.fn(() => Promise.resolve());
      run({ origin, capacitor: { nativePromise } });
      expect(nativePromise).toHaveBeenCalledWith("SplashScreen", "hide", { fadeOutDuration: 200 });
    }
  });

  it("survives a missing bridge, a throwing one and a rejected hide", async () => {
    expect(() => run({ origin: "https://www.vallospaces.com" })).not.toThrow();
    expect(() =>
      run({ capacitor: { nativePromise: () => { throw new Error("no plugin"); } } }),
    ).not.toThrow();
    const shell = run({
      origin: "https://www.vallospaces.com",
      capacitor: { nativePromise: () => Promise.reject(new Error("not implemented")) },
    });
    await settle();
    expect(shell.body.attrs["data-state"]).toBeUndefined();
  });

  it("uses only a bridge member that @capacitor/core declares", () => {
    const require = createRequire(import.meta.url);
    const definitions = readFileSync(require.resolve("@capacitor/core/types/definitions-internal.d.ts"), "utf8");
    expect(shellJs).toContain('cap.nativePromise("SplashScreen", "hide"');
    expect(definitions).toMatch(/nativePromise:/);
  });
});

/*
 * THE CARD THE FOUNDER SAW (8 October 2026). On TestFlight with a weak signal
 * it said nothing could open, under a placeholder drawing of five towers. It
 * is now reached only on a first launch with no signal (the service worker
 * answers every launch after that, App-Bound Domains on iOS), it draws the
 * real mark, says one calm thing, and keeps trying by itself.
 */
describe("the card is calm, branded and keeps trying", () => {
  it("draws the real mark from the binary, not an inline placeholder", () => {
    expect(html).toMatch(/<img class="mark" src="vallo-mark\.svg"/);
    expect(html).not.toMatch(/<svg[^>]*class="mark"/);
    const packaged = readFileSync(`${shellDir}vallo-mark.svg`, "utf8");
    const brand = readFileSync(fileURLToPath(new URL("../../../public/brand/vallo-mark.svg", import.meta.url)), "utf8");
    expect(packaged).toBe(brand);
  });

  it("does not tell the reader that nothing can open", () => {
    const text = visibleText(html);
    expect(text).not.toMatch(/none of them can open|could not reach the network|aeroplane mode/i);
    expect(text).toContain("Waiting for a connection");
  });

  it("tries again by itself on a slow backoff after a failed probe, without waiting for an online event", async () => {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const shell = run({ origin: "https://www.vallospaces.com", reachable: false });
    /* The harness window has no timers of its own: give it scripted ones and start the card again. */
    const win = shell.win as Record<string, unknown>;
    win.setTimeout = (fn: () => void, ms: number) => {
      timers.push({ fn, ms });
      return timers.length;
    };
    win.clearTimeout = () => undefined;
    const api = (win as { __valloShell?: { start: (w: unknown, d: unknown) => unknown; backoffAt: (n: number) => number } }).__valloShell!;
    api.start(win, win.document);
    expect(timers.map((t) => t.ms)).toEqual([2000]);
    timers.shift()!.fn();
    await settle();
    expect(shell.fetch).toHaveBeenCalledTimes(1);
    expect(shell.elements.still!.hidden).toBe(false);
    expect(timers.map((t) => t.ms)).toEqual([4000]);
    expect([0, 1, 2, 3, 4, 9].map(api.backoffAt)).toEqual([2000, 4000, 8000, 15000, 30000, 30000]);
  });
});

describe("the iOS app may run the service worker", () => {
  const plist = readFileSync(fileURLToPath(new URL("../../../ios/App/App/Info.plist", import.meta.url)), "utf8");
  const config = readFileSync(fileURLToPath(new URL("../../../capacitor.config.ts", import.meta.url)), "utf8");

  it("names its app-bound domains, the live origin and the packaged shell among them", () => {
    const block = /<key>WKAppBoundDomains<\/key>\s*<array>([\s\S]*?)<\/array>/.exec(plist)?.[1] ?? "";
    const domains = [...block.matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]);
    for (const host of ["www.vallospaces.com", "vallospaces.com", "localhost", "checkout.paystack.com", "checkout.paystack.co"]) {
      expect(domains).toContain(host);
    }
    /* WebKit honours at most ten. */
    expect(domains.length).toBeLessThanOrEqual(10);
  });

  it("limits navigation to them, as Capacitor requires once the list exists", () => {
    expect(config).toMatch(/limitsNavigationsToAppBoundDomains: true/);
  });
});
