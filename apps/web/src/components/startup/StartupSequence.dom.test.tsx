/**
 * The startup sequence in a real Chromium, with its real stylesheet and its
 * real inline script, against the three things a stand-in cannot show
 * (`startup-script.test.ts` holds the timing to the millisecond):
 *
 *   - a finger that taps to skip does not also tap whatever the door
 *     reveals beneath it (the browser's own click after the tap);
 *   - the lockup eases out of its breath when the door opens instead of
 *     snapping from the hold's scale;
 *   - under the platform's reduced-motion setting the overlay is drawn,
 *     still, and leaves by a crossfade rather than never showing.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, hasBrowser } from "@/lib/testing/mount-in-browser";
import { StartupSequence } from "./StartupSequence";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });

const WEB = join(__dirname, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");
const CSS = [
  read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
  /* threshold.css's half of the contract: the overlay is hidden outside "on". */
  "@layer components { .nf-splash { display: none; } }",
  read("src", "components", "startup", "startup.css"),
  "body { margin: 0; } #beneath { position: fixed; inset: 0; }",
].join("\n");

const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

let browser: Browser | null = null;
beforeAll(async () => {
  if (hasBrowser && CHROMIUM) browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
});
afterAll(async () => {
  await browser?.close();
});

/**
 * The page as the root layout draws it on a cold start: the gate has set the
 * flag, the page is beneath (here one full-screen button that counts its
 * clicks), and the overlay and its script follow. `slow` holds the document
 * open (a parser-blocking script the server is slow to send), which is the
 * "not ready" case: the lockup holds and breathes.
 */
async function open(context: BrowserContextOptions, { slow = 0 } = {}): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser!.newContext({ viewport: { width: 390, height: 844 }, ...context });
  const page = await ctx.newPage();
  const overlay = renderToStaticMarkup(<StartupSequence />);
  await page.route("http://vallo.test/slow.js", async (route) => {
    await new Promise((r) => setTimeout(r, slow));
    await route.fulfill({ contentType: "text/javascript", body: "" });
  });
  await page.route("http://vallo.test/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en" data-splash="on"><head><style>${CSS}</style></head><body>
        <button id="beneath" type="button" onclick="window.__clicks=(window.__clicks||0)+1">Get started</button>
        ${overlay}
        ${slow ? '<script src="http://vallo.test/slow.js"></script>' : ""}
      </body></html>`,
    }),
  );
  await page.goto("http://vallo.test/", { waitUntil: "commit" });
  await page.waitForSelector(".nf-startup", { state: "attached" });
  return { page, close: () => ctx.close() };
}

const clicks = (page: Page) => page.evaluate(() => (window as unknown as { __clicks?: number }).__clicks ?? 0);
const root = (page: Page, key: "splash" | "startup") => page.evaluate((k) => document.documentElement.dataset[k], key);

describe.skipIf(!hasBrowser && !process.env.CI)("the startup sequence, in a browser", () => {
  it("a tap that skips it does not also tap what the door reveals", async () => {
    const { page, close } = await open({ hasTouch: true, isMobile: true });
    try {
      await page.waitForTimeout(250);
      await page.touchscreen.tap(195, 600);
      expect(await root(page, "startup")).toBe("open");
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 5000 });
      expect(await clicks(page)).toBe(0);
      /* The next tap is the member's, and lands. */
      await page.waitForTimeout(500);
      await page.touchscreen.tap(195, 600);
      await page.waitForFunction(() => (window as unknown as { __clicks?: number }).__clicks === 1, null, { timeout: 5000 });
    } finally {
      await close();
    }
  });

  it("a key skips it once", async () => {
    const { page, close } = await open({}, { slow: 6000 });
    try {
      await page.waitForTimeout(300);
      expect(await root(page, "startup")).toBeUndefined();
      await page.keyboard.press("Tab");
      expect(await root(page, "startup")).toBe("open");
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 5000 });
    } finally {
      await close();
    }
  });

  it("opens by the ceiling while the document is still arriving", async () => {
    const { page, close } = await open({}, { slow: 8000 });
    try {
      await page.waitForTimeout(3000);
      expect(await root(page, "startup")).toBeUndefined();
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 3000 });
    } finally {
      await close();
    }
  });

  it("the lockup eases out of its breath when the door opens, rather than snapping", async () => {
    const { page, close } = await open({}, { slow: 8000 });
    try {
      /* Deep in the hold: the lockup is near 1.015. */
      await page.waitForTimeout(2800);
      const held = await page.$eval(".nf-startup__lockup", (el) => getComputedStyle(el).scale);
      expect(Number(held)).toBeGreaterThan(1.004);
      await page.keyboard.press("Enter");
      const after = await page.$eval(
        ".nf-startup__lockup",
        (el) => new Promise<string>((resolve) => requestAnimationFrame(() => resolve(getComputedStyle(el).scale))),
      );
      expect(after).not.toBe("none");
      expect(Number(after)).toBeGreaterThan(1);
      /* ...and lands on exactly 1, the size Get Started's and the lock's mark are. */
      await page.waitForTimeout(500);
      const settled = await page.$eval(".nf-startup__lockup", (el) => getComputedStyle(el).scale);
      expect(settled === "none" || Number(settled) === 1).toBe(true);
    } finally {
      await close();
    }
  });

  it("under reduced motion it is drawn still and leaves by a 160ms crossfade", async () => {
    const { page, close } = await open({ reducedMotion: "reduce" }, { slow: 1200 });
    try {
      expect(await page.$eval(".nf-startup", (el) => getComputedStyle(el).display)).toBe("block");
      expect(await page.$eval(".nf-startup__letter", (el) => getComputedStyle(el).animationName)).toBe("none");
      expect(await page.$eval(".nf-startup__letter", (el) => getComputedStyle(el).opacity)).toBe("1");
      await page.waitForFunction(() => document.documentElement.dataset.startup === "open", null, { timeout: 5000 });
      expect(await page.$eval(".nf-startup", (el) => getComputedStyle(el).animationName)).toBe("nf-startup-fade");
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 2000 });
    } finally {
      await close();
    }
  });
});
