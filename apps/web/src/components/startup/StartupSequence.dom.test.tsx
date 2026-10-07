/**
 * The first open in a real Chromium, with the real stylesheets (the tokens,
 * the reduced-motion floor in `animation.css`, the startup's own) and the
 * real inline script and brand images, reading what the browser computes
 * rather than the clock (`startup-script.test.ts` holds the script's own
 * timing):
 *
 *   - the real glass mark and chrome wordmark are drawn (images, not the
 *     vector redraw), the mark rises and the wordmark follows, and one light
 *     sweeps the glass, masked to the mark's own shape;
 *   - the door opens at 1350ms on the stylesheet's clock, even when the main
 *     thread is blocked across it (a mid-range phone hydrating), and fades
 *     and lifts the whole overlay;
 *   - a page still streaming does NOT hold it: the door opens on schedule;
 *   - a tap skips it at once and the tap's own click does not land on what
 *     the door reveals; a tap after the door is the member's;
 *   - under the platform's reduced-motion setting the lockup is still and
 *     leaves by a real 200ms crossfade at 500ms (not the floor's instant cut);
 *   - the native splash is told to hide on the document's first parse,
 *     before load and before any frame, whether or not the sequence plays,
 *     and the beats are held at their first frame until it has answered.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { transformSync } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, hasBrowser } from "@/lib/testing/mount-in-browser";
import { StartupSequence } from "./StartupSequence";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });

const WEB = join(__dirname, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");
/* Minified, as a production build serves it: a minifier writes 1350ms as
   1.35s, and the script reads the stylesheet's numbers. */
const CSS = transformSync(
  [
    read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
    /* The reduced-motion floor every page carries: the crossfade must survive it. */
    read("src", "app", "css", "animation.css"),
    /* threshold.css's half of the contract: the overlay is hidden outside "on". */
    "@layer components { .nf-splash { display: none; } }",
    read("src", "components", "startup", "startup.css"),
    "body { margin: 0; } #beneath { position: fixed; inset: 0; }",
  ].join("\n"),
  { loader: "css", minify: true },
).code;

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

/** A plain page: one full-screen button that counts its clicks. */
const BUTTON = `<button id="beneath" type="button">Get started</button>`;
/** React's marker for a Suspense boundary whose content has not streamed in yet. */
const PENDING = `<!--$?--><template id="B:0"></template><p>Loading</p><!--/$-->`;

/**
 * Instruments every page: clicks that reach the document (an eaten click
 * never does), the sequence's own clock, and (when `__native` is set) a
 * stand-in for the Capacitor bridge that records when the native splash is
 * told to hide and answers after `__native` milliseconds.
 */
const PROBE = `
  window.__clicks = 0;
  document.addEventListener("click", (e) => { e.preventDefault(); window.__clicks++; }, true);
  /* The sequence's clock: the time since the overlay's first frame. */
  window.__t0 = -1;
  /* On the overlay's first frame, before any door can open, what the
     stylesheet has declared for it: read in the page, so a busy machine that
     answers late cannot make the test race a short-lived animation. */
  const declared = () => {
    const css = (s) => getComputedStyle(document.querySelector(s));
    const overlay = css(".nf-startup"), mark = css(".nf-startup__mark");
    return {
      display: overlay.display,
      name: overlay.animationName,
      duration: overlay.animationDuration,
      delay: overlay.animationDelay,
      mark: mark.animationName,
      opacity: mark.opacity,
      transform: mark.transform,
      word: css(".nf-startup__word").opacity,
      shine: css(".nf-startup__shine").display,
    };
  };
  const first = (t) => {
    if (document.querySelector(".nf-startup") && document.documentElement.dataset.splash === "on") {
      window.__t0 = t;
      window.__first = declared();
    } else requestAnimationFrame(first);
  };
  requestAnimationFrame(first);
  window.__clock = () => (window.__t0 < 0 ? -1 : performance.now() - window.__t0);
  window.__hides = [];
  window.__frames = 0;
  requestAnimationFrame(function count() { window.__frames++; requestAnimationFrame(count); });
  const wait = Number(new URLSearchParams(location.search).get("native"));
  if (location.search.includes("native")) {
    window.Capacitor = {
      isNativePlatform: () => true,
      nativePromise: (plugin, method, options) => {
        window.__hides.push({ plugin, method, options, frames: window.__frames, loaded: document.readyState === "complete" });
        return new Promise((r) => setTimeout(r, wait));
      },
    };
  }
`;

/**
 * The page as the root layout draws it on a cold start: the gate has set the
 * flag (unless `gate` is false), the page is above in the document, and the
 * overlay and its script follow. `slow` holds the document open after the
 * overlay (a parser-blocking script the server is slow to send). `native`,
 * when set, installs the bridge, answering the hide after that many ms.
 */
async function open(
  context: BrowserContextOptions,
  { slow = 0, beneath = BUTTON, gate = true, slowImage = 0, native = null as number | null } = {},
): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser!.newContext({ viewport: { width: 390, height: 844 }, ...context });
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  const overlay = renderToStaticMarkup(<StartupSequence />);
  await page.route("http://vallo.test/slow.js", async (route) => {
    await new Promise((r) => setTimeout(r, slow));
    await route.fulfill({ contentType: "text/javascript", body: "" });
  });
  await page.route("http://vallo.test/slow.png", async (route) => {
    await new Promise((r) => setTimeout(r, slowImage));
    await route.fulfill({ contentType: "image/png", body: Buffer.alloc(0) });
  });
  /* The real brand images, from public/. */
  await page.route(/^http:\/\/vallo\.test\/brand\/startup\//, (route) =>
    route.fulfill({
      contentType: "image/webp",
      body: readFileSync(join(WEB, "public", "brand", "startup", basename(new URL(route.request().url()).pathname))),
    }),
  );
  await page.route(/^http:\/\/vallo\.test\/(\?.*)?$/, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"${gate ? ' data-splash="on"' : ""}><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head><body>
        ${beneath}
        ${slowImage ? '<img src="http://vallo.test/slow.png" alt="">' : ""}
        ${overlay}
        ${slow ? '<script src="http://vallo.test/slow.js"></script>' : ""}
      </body></html>`,
    }),
  );
  await page.goto(native === null ? "http://vallo.test/" : `http://vallo.test/?native=${native}`, { waitUntil: "commit" });
  await page.waitForSelector(".nf-startup", { state: "attached" });
  return { page, close: () => ctx.close() };
}

const clicks = (page: Page) => page.evaluate(() => (window as unknown as { __clicks: number }).__clicks);
const root = (page: Page, key: "splash" | "startup" | "startupNative") => page.evaluate((k) => document.documentElement.dataset[k], key);
const at = (page: Page, ms: number) =>
  page.waitForFunction((t) => (window as unknown as { __clock: () => number }).__clock() >= t, ms, { timeout: 8000 });
const done = (page: Page, timeout = 5000) =>
  page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout });

describe.skipIf(!hasBrowser && !process.env.CI)("the first open, in a browser", () => {
  it("draws the real brand art: the glass mark rises, the wordmark follows, one light sweeps the glass", async () => {
    const { page, close } = await open({});
    try {
      await page.waitForFunction(() => Boolean((window as unknown as { __first?: unknown }).__first), null, { timeout: 8000 });
      const first = await page.evaluate(() => (window as unknown as { __first: Record<string, string> }).__first);
      /* The first frame: the bare ground, the mark not yet risen. */
      expect(first).toMatchObject({ display: "block", name: "nf-startup-door", duration: "0.4s", delay: "1.35s", mark: "nf-startup-rise", opacity: "0", word: "0" });
      expect(first.transform).not.toBe("none");

      const art = await page.evaluate(async () => {
        const imgs = [...document.querySelectorAll<HTMLImageElement>(".nf-startup img")];
        await Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
        const shine = document.querySelector(".nf-startup__shine")!;
        const sweep = getComputedStyle(shine, "::before");
        return {
          svgs: document.querySelectorAll(".nf-startup svg").length,
          images: imgs.map((img) => ({ src: new URL(img.src).pathname, alt: img.alt, loaded: img.naturalWidth > 0 })),
          mask: getComputedStyle(shine).maskImage || getComputedStyle(shine).webkitMaskImage,
          sweep: [sweep.animationName, sweep.animationDuration, sweep.animationDelay],
          word: getComputedStyle(document.querySelector(".nf-startup__word")!).animationDelay,
          hidden: document.querySelector(".nf-startup")!.getAttribute("aria-hidden"),
        };
      });
      expect(art.svgs).toBe(0);
      expect(art.hidden).toBe("true");
      expect(art.images).toEqual([
        { src: "/brand/startup/vallo-mark.webp", alt: "", loaded: true },
        { src: "/brand/startup/vallo-wordmark.webp", alt: "", loaded: true },
      ]);
      expect(art.mask).toContain("/brand/startup/vallo-mark.webp");
      expect(art.sweep).toEqual(["nf-startup-sweep", "0.9s", "0.56s"]);
      /* The wordmark 120ms behind the mark. */
      expect(art.word).toBe("0.18s");

      /* Settled before the door: the mark at rest and fully there. */
      await at(page, 1000);
      const settled = await page.$eval(".nf-startup__mark", (el) => {
        const s = getComputedStyle(el);
        return { opacity: Number(s.opacity), scale: s.transform === "none" ? 1 : new DOMMatrix(s.transform).a };
      });
      expect(settled.opacity).toBeGreaterThan(0.95);
      expect(settled.scale).toBeGreaterThan(0.99);
      await done(page);
    } finally {
      await close();
    }
  });

  it("the door opens at 1350ms on the stylesheet's clock even while the main thread is blocked, and fades and lifts the overlay", async () => {
    const { page, close } = await open({});
    try {
      await at(page, 700);
      const { doorAt, ...seen } = await page.evaluate(async () => {
        const rise = document.querySelector(".nf-startup__mark")!.getAnimations()[0]!;
        const door = document.querySelector(".nf-startup")!.getAnimations()[0]!;
        const start = (a: Animation) => Number(a.startTime) + Number(a.effect!.getComputedTiming().delay);
        const due = start(door) - (start(rise) - 60);
        /* A mid-range phone hydrating: the main thread does nothing else
           until 1550ms, straddling the door, and is free before it ends. */
        const end = performance.now() + (1550 - Number(door.currentTime));
        while (performance.now() < end) {
          /* busy */
        }
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        const overlay = getComputedStyle(document.querySelector(".nf-startup")!);
        return {
          doorAt: due,
          opacity: Number(overlay.opacity),
          scale: new DOMMatrix(overlay.transform).a,
          catches: overlay.pointerEvents,
        };
      });
      expect(Math.abs(doorAt - 1350)).toBeLessThan(20);
      /* By the time the thread is free the door is under way on the compositor. */
      expect(seen.opacity).toBeLessThan(0.95);
      expect(seen.scale).toBeGreaterThan(1);
      expect(seen.scale).toBeLessThanOrEqual(1.04);
      expect(seen.catches).toBe("none");
      await done(page);
      expect(await page.evaluate(() => (window as unknown as { __clock: () => number }).__clock())).toBeLessThan(2500);
    } finally {
      await close();
    }
  });

  it("does not hold for a page still streaming: the door opens on schedule over the page's own loading state", async () => {
    const { page, close } = await open({}, { slow: 6000, beneath: PENDING + BUTTON });
    try {
      await done(page, 4000);
      expect(await page.evaluate(() => document.readyState)).toBe("loading");
      expect(await page.evaluate(() => (window as unknown as { __clock: () => number }).__clock())).toBeLessThan(2500);
    } finally {
      await close();
    }
  });

  it("a tap skips it at once, without tapping what the door reveals, and the next tap lands", async () => {
    const { page, close } = await open({ hasTouch: true, isMobile: true }, { slow: 6000, beneath: PENDING + BUTTON });
    try {
      await at(page, 250);
      await page.touchscreen.tap(195, 600);
      expect(await root(page, "startup")).toBe("open");
      await done(page);
      expect(await clicks(page)).toBe(0);
      await page.waitForTimeout(500);
      await page.touchscreen.tap(195, 600);
      await page.waitForFunction(() => (window as unknown as { __clicks: number }).__clicks === 1, null, { timeout: 5000 });
    } finally {
      await close();
    }
  });

  it("a tap after the door has opened is the member's own, and lands", async () => {
    const { page, close } = await open({ hasTouch: true, isMobile: true });
    try {
      await at(page, 1500);
      await page.touchscreen.tap(195, 600);
      await page.waitForFunction(() => (window as unknown as { __clicks: number }).__clicks === 1, null, { timeout: 3000 });
    } finally {
      await close();
    }
  });

  it("a key skips it once", async () => {
    const { page, close } = await open({}, { slow: 6000, beneath: PENDING });
    try {
      await at(page, 300);
      expect(await root(page, "startup")).toBeUndefined();
      await page.keyboard.press("Tab");
      expect(await root(page, "startup")).toBe("open");
      await done(page);
    } finally {
      await close();
    }
  });

  it("under reduced motion the lockup is still and leaves by a real 200ms crossfade at 500ms", async () => {
    const { page, close } = await open({ reducedMotion: "reduce" });
    try {
      /* Read from the overlay's first frame, recorded in the page (PROBE), so
         a loaded machine cannot race the 500ms door. */
      await page.waitForFunction(() => Boolean((window as unknown as { __first?: unknown }).__first), null, { timeout: 8000 });
      const still = await page.evaluate(() => (window as unknown as { __first: Record<string, unknown> }).__first);
      expect(still).toEqual({
        display: "block",
        name: "nf-startup-fade",
        duration: "0.2s",
        delay: "0.5s",
        /* Nothing rises, follows or sweeps: the lockup is simply there. */
        mark: "none",
        opacity: "1",
        transform: "none",
        word: "1",
        shine: "none",
      });
      await done(page);
    } finally {
      await close();
    }
  });

  it("tells the native splash to hide on the first parse, before load and before any frame, with the sequence and without it", async () => {
    for (const gate of [true, false]) {
      const { page, close } = await open({}, { gate, slowImage: 3000, native: 0 });
      try {
        await page.waitForFunction(() => (window as unknown as { __hides: unknown[] }).__hides.length > 0, null, { timeout: 2000 });
        const hides = await page.evaluate(() => (window as unknown as { __hides: { method: string; loaded: boolean; frames: number }[] }).__hides);
        expect(hides).toHaveLength(1);
        expect(hides[0]).toMatchObject({ plugin: "SplashScreen", method: "hide", options: { fadeOutDuration: 160 }, loaded: false, frames: 0 });
        if (gate) await done(page);
        else expect(await root(page, "startupNative")).toBeUndefined();
      } finally {
        await close();
      }
    }
  });

  it("on the shell, holds the beats at their first frame until the hide is answered, then plays them in full", async () => {
    const { page, close } = await open({}, { native: 400 });
    try {
      await at(page, 200);
      const held = await page.evaluate(() => ({
        wait: document.documentElement.dataset.startupNative,
        state: getComputedStyle(document.querySelector(".nf-startup__mark")!).animationPlayState,
        rise: Number(document.querySelector(".nf-startup__mark")!.getAnimations()[0]!.currentTime),
      }));
      expect(held).toEqual({ wait: "wait", state: "paused", rise: 0 });
      await page.waitForFunction(() => document.documentElement.dataset.startupNative === undefined, null, { timeout: 3000 });
      expect(await page.$eval(".nf-startup__mark", (el) => getComputedStyle(el).animationPlayState)).toBe("running");
      /* The rise plays out from its start, so the mark is still arriving
         just after the wait. */
      expect(await page.$eval(".nf-startup__mark", (el) => Number(el.getAnimations()[0]!.currentTime))).toBeLessThan(400);
      await done(page);
      expect(await root(page, "startupNative")).toBeUndefined();
    } finally {
      await close();
    }
  });
});
