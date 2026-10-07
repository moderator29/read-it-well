/**
 * The first open in a real Chromium, with the real stylesheets (the tokens,
 * the reduced-motion floor in `animation.css`, the startup and Get Started)
 * and the real inline script, reading what the browser computes rather than
 * the clock (`startup-script.test.ts` holds the script's own timing):
 *
 *   - ready early, the door opens at 1150ms on the stylesheet's clock, even
 *     when the main thread is blocked across it (a mid-range phone hydrating),
 *     and Get Started's entrance comes out of it on the same clock;
 *   - a tap skips it at once, the mark rises out of the parting ground and
 *     lands exactly on Get Started's mark, and the tap's own click does not
 *     land on what the door reveals; a tap after the door is the member's;
 *   - a page still streaming holds it, settled and breathing, until the page
 *     has arrived, and the lockup eases out of the hold rather than snapping;
 *   - under the platform's reduced-motion setting the still lockup sits on
 *     Get Started's mark and leaves by a real 160ms crossfade (not the
 *     floor's instant cut);
 *   - the native splash comes down on the first painted frame whether or not
 *     the sequence plays.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { transformSync } from "esbuild";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { BROWSER_TEST_TIMEOUT, hasBrowser } from "@/lib/testing/mount-in-browser";
import { forWelcome } from "@/components/auth/auth-copy";
import { WelcomeIntro } from "@/app/welcome/WelcomeIntro";
import { StartupSequence } from "./StartupSequence";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });

const WEB = join(__dirname, "..", "..", "..");
const read = (...parts: string[]) => readFileSync(join(WEB, ...parts), "utf8");
/* Minified, as a production build serves it: a minifier writes 1150ms as
   1.15s, and the script reads the stylesheet's numbers. */
const CSS = transformSync(
  [
    read("..", "..", "packages", "design-tokens", "src", "tokens.css"),
    /* The reduced-motion floor every page carries: the crossfade must survive it. */
    read("src", "app", "css", "animation.css"),
    /* threshold.css's half of the contract: the overlay is hidden outside "on". */
    "@layer components { .nf-splash { display: none; } }",
    read("src", "components", "startup", "startup.css"),
    read("src", "app", "welcome", "get-started.css"),
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

/** Get Started as the server renders it, the first screen of a cold start. */
const GET_STARTED = renderToStaticMarkup(<WelcomeIntro t={forWelcome(getDictionary("en"))} />);
/** A plain page: one full-screen button that counts its clicks. */
const BUTTON = `<button id="beneath" type="button">Get started</button>`;
/** React's marker for a Suspense boundary whose content has not streamed in yet. */
const PENDING = `<!--$?--><template id="B:0"></template><p>Loading</p><!--/$-->`;

/**
 * Instruments every page: clicks that reach the document (an eaten click
 * never does), the sequence's own clock, and a stand-in for the
 * Capacitor bridge that records when the native splash is told to hide.
 */
const PROBE = `
  window.__clicks = 0;
  document.addEventListener("click", (e) => { e.preventDefault(); window.__clicks++; }, true);
  /* The sequence's clock: the time since the overlay's first frame, which
     is the frame every beat starts on. */
  window.__t0 = -1;
  /* On the overlay's first frame, before any door can open, what the
     stylesheet has declared for it: read in the page, so a busy machine that
     answers late cannot make the test race a short-lived animation. */
  const declared = () => {
    const css = (s) => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
    const box = (s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, w: r.width } : null; };
    const overlay = css(".nf-startup"), front = css(".nf-gsm__front"), letter = css(".nf-startup__letter");
    return {
      display: overlay.display,
      name: overlay.animationName,
      duration: overlay.animationDuration,
      delay: overlay.animationDelay,
      letters: letter.animationName,
      opacity: letter.opacity,
      lockup: css(".nf-startup__lockup").transform,
      front: front ? [front.animationName, front.animationDuration, front.animationDelay] : null,
      mark: box(".nf-startup__mark"),
      target: box(".nf-gsm__mark"),
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
  /* Where the mark is on the door's last frame, before the release hides it. */
  document.addEventListener("animationend", (e) => {
    if (!(e.target instanceof Element) || !e.target.classList.contains("nf-startup")) return;
    const r = document.querySelector(".nf-startup__mark").getBoundingClientRect();
    window.__landed = { x: r.x, y: r.y, w: r.width };
  }, true);
  window.__hides = [];
  window.Capacitor = {
    isNativePlatform: () => true,
    nativePromise: (plugin, method, options) => {
      window.__hides.push({ plugin, method, options, at: performance.now(), loaded: document.readyState === "complete" });
      return Promise.resolve();
    },
  };
`;

/**
 * The page as the root layout draws it on a cold start: the gate has set the
 * flag (unless `gate` is false), the page is above in the document, and the
 * overlay and its script follow. `slow` holds the document open after the
 * overlay (a parser-blocking script the server is slow to send).
 */
async function open(
  context: BrowserContextOptions,
  { slow = 0, beneath = GET_STARTED, gate = true, slowImage = 0 } = {},
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
  await page.route("http://vallo.test/", (route) =>
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
  await page.goto("http://vallo.test/", { waitUntil: "commit" });
  await page.waitForSelector(".nf-startup", { state: "attached" });
  return { page, close: () => ctx.close() };
}

const clicks = (page: Page) => page.evaluate(() => (window as unknown as { __clicks: number }).__clicks);
const root = (page: Page, key: "splash" | "startup") => page.evaluate((k) => document.documentElement.dataset[k], key);
const at = (page: Page, ms: number) =>
  page.waitForFunction((t) => (window as unknown as { __clock: () => number }).__clock() >= t, ms, { timeout: 8000 });
/** Read in the next frame, so the timeline has caught up with the clock. */
const nextFrame = <T,>(page: Page, fn: () => T) =>
  page.evaluate(async (source) => {
    await new Promise((r) => requestAnimationFrame(r));
    return (0, eval)(`(${source})`)();
  }, fn.toString()) as Promise<T>;
const box = (page: Page, selector: string) =>
  page.$eval(selector, (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the first open, in a browser", () => {
  it("ready early, the door opens at 1150ms on the stylesheet's clock even while the main thread is blocked", async () => {
    const { page, close } = await open({});
    try {
      await at(page, 650);
      /* When the door is due, on the sequence's clock (the mark's turn starts
         at 120ms on it), read from the animations the stylesheet has already
         scheduled; then a mid-range phone hydrating: the main thread does
         nothing else until 1430ms, straddling the door, and is free again
         before the door has finished (1530ms), so what it sees is the door
         in progress. */
      const { doorAt, ...seen } = await page.evaluate(async () => {
        const turn = document.querySelector(".nf-startup__mark")!.getAnimations()[0]!;
        const door = document.querySelector(".nf-startup__leaf--a")!.getAnimations()[0]!;
        const start = (a: Animation) => Number(a.startTime) + Number(a.effect!.getComputedTiming().delay);
        const due = start(door) - (start(turn) - 120);
        const end = performance.now() + (1430 - Number(door.currentTime));
        while (performance.now() < end) {
          /* busy */
        }
        /* Two frames after: the first still carries the time stamp the
           compositor issued while the thread was busy; by the second the
           timeline has caught up with the clock. */
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        const leaf = document.querySelector(".nf-startup__leaf--a")!;
        return {
          doorAt: due,
          leaf: new DOMMatrix(getComputedStyle(leaf).transform).m41 / leaf.getBoundingClientRect().width,
          lockup: getComputedStyle(document.querySelector(".nf-startup__lockup")!).transform,
          line: Number(getComputedStyle(document.querySelector(".nf-gsm__line")!).opacity),
        };
      });
      expect(Math.abs(doorAt - 1150)).toBeLessThan(20);
      /* By the time the thread is free the leaves are most of the way apart,
         the mark is on its way down to Get Started's, and Get Started's line
         is already arriving out of the door. (Before round 5 the door waited
         for the script, so here it had not begun.) */
      expect(seen.leaf).toBeLessThan(-0.5);
      expect(seen.lockup).not.toBe("none");
      expect(seen.line).toBeGreaterThan(0.5);
    } finally {
      await close();
    }
  });

  it("a tap skips it at once: the mark rises out of the parting ground and lands on Get Started's mark, and the tap's click is eaten", async () => {
    /* Held (a page still streaming), so a loaded machine that taps late
       still taps before the door. */
    const { page, close } = await open({ hasTouch: true, isMobile: true }, { slow: 6000, beneath: GET_STARTED + PENDING });
    try {
      await at(page, 300);
      const hero = await box(page, ".nf-startup__mark");
      const target = await box(page, ".nf-gsm__mark");
      await page.touchscreen.tap(195, 600);
      expect(await root(page, "startup")).toBe("open");
      /* Before it moves, the mark is the brand's: centred, twice the size. */
      expect(hero.w).toBeGreaterThan(target.w * 1.4);
      expect(hero.y).toBeGreaterThan(target.y + 100);
      /* On its way: smaller than the brand's, larger than Get Started's,
         and still above where it lands. */
      await page.waitForTimeout(60);
      const moving = await nextFrame(page, () => {
        const m = new DOMMatrix(getComputedStyle(document.querySelector(".nf-startup__lockup")!).transform);
        return { scale: m.a, rise: m.f };
      });
      expect(moving.scale).toBeGreaterThan(1);
      expect(moving.scale).toBeLessThan(2);
      expect(moving.rise).toBeGreaterThan(0);
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 3000 });
      const landed = await page.evaluate(() => (window as unknown as { __landed: { x: number; y: number; w: number } }).__landed);
      expect(Math.abs(landed.x - target.x)).toBeLessThan(1);
      expect(Math.abs(landed.y - target.y)).toBeLessThan(1);
      expect(Math.abs(landed.w - target.w)).toBeLessThan(1);
      /* One mark: Get Started's own is shown once the startup's has landed. */
      expect(await page.$eval(".nf-gsm__vmark", (el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await clicks(page)).toBe(0);
    } finally {
      await close();
    }
  });

  it("a tap after the door has opened is the member's own, and lands", async () => {
    const { page, close } = await open({ hasTouch: true, isMobile: true }, { beneath: BUTTON });
    try {
      await at(page, 1300);
      await page.touchscreen.tap(195, 600);
      await page.waitForFunction(() => (window as unknown as { __clicks: number }).__clicks === 1, null, { timeout: 3000 });
    } finally {
      await close();
    }
  });

  it("a tap on a plain page skips without tapping what the door reveals, and the next tap lands", async () => {
    const { page, close } = await open({ hasTouch: true, isMobile: true }, { slow: 6000, beneath: PENDING + BUTTON });
    try {
      await at(page, 250);
      await page.touchscreen.tap(195, 600);
      expect(await root(page, "startup")).toBe("open");
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 5000 });
      expect(await clicks(page)).toBe(0);
      await page.waitForTimeout(500);
      await page.touchscreen.tap(195, 600);
      await page.waitForFunction(() => (window as unknown as { __clicks: number }).__clicks === 1, null, { timeout: 5000 });
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
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 5000 });
    } finally {
      await close();
    }
  });

  it("holds, settled and breathing, while the page is still streaming, and opens when it has arrived", async () => {
    const { page, close } = await open({}, { slow: 2600, beneath: PENDING + BUTTON });
    try {
      await at(page, 1900);
      const held = await nextFrame(page, () => ({
        leaf: new DOMMatrix(getComputedStyle(document.querySelector(".nf-startup__leaf--a")!).transform).m41,
        catches: getComputedStyle(document.querySelector(".nf-startup")!).pointerEvents,
      }));
      expect(held).toEqual({ leaf: 0, catches: "auto" });
      expect(await root(page, "startup")).toBeUndefined();
      await page.waitForFunction(() => document.readyState !== "loading", null, { timeout: 8000 });
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 2000 });
    } finally {
      await close();
    }
  });

  it("never holds past the four-second ceiling, whatever the stream does", async () => {
    const { page, close } = await open({}, { slow: 9000, beneath: PENDING });
    try {
      await at(page, 3700);
      expect(await root(page, "startup")).toBeUndefined();
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 3000 });
      expect(await page.evaluate(() => (window as unknown as { __clock: () => number }).__clock())).toBeLessThan(5000);
    } finally {
      await close();
    }
  });

  it("the lockup eases out of the hold when the door opens, rather than snapping", async () => {
    const { page, close } = await open({}, { slow: 9000, beneath: PENDING });
    try {
      /* Deep in the hold: the lockup is near 1.015. */
      await at(page, 2800);
      const scale = () => Number(getComputedStyle(document.querySelector(".nf-startup__breath")!).scale);
      expect(await nextFrame(page, scale)).toBeGreaterThan(1.004);
      await page.keyboard.press("Enter");
      expect(await nextFrame(page, scale)).toBeGreaterThan(1);
      /* ...and lands on exactly 1, the size Get Started's and the lock's mark are. */
      await page.waitForTimeout(500);
      const settled = await page.$eval(".nf-startup__breath", (el) => getComputedStyle(el).scale);
      expect(settled === "none" || Number(settled) === 1).toBe(true);
    } finally {
      await close();
    }
  });

  it("under reduced motion the still lockup sits on Get Started's mark and leaves by a real 160ms crossfade", async () => {
    const { page, close } = await open({ reducedMotion: "reduce" });
    try {
      /* Read from the overlay's first frame, recorded in the page (PROBE), so
         a loaded machine cannot race the 600ms door. */
      await page.waitForFunction(() => Boolean((window as unknown as { __first?: unknown }).__first), null, { timeout: 8000 });
      const { mark, target, ...still } = await page.evaluate(
        () =>
          (window as unknown as { __first: Record<string, unknown> & { mark: { y: number; w: number }; target: { y: number; w: number } } })
            .__first,
      );
      expect(still).toEqual({
        display: "block",
        name: "nf-startup-fade",
        duration: "0.16s",
        delay: "0.6s",
        letters: "none",
        opacity: "1",
        lockup: "none",
        /* The other half of the crossfade: Get Started fades in as it goes. */
        front: ["nf-gsm-fade", "0.16s", "0.6s"],
      });
      expect(Math.abs(mark.y - target.y)).toBeLessThan(1);
      expect(Math.abs(mark.w - target.w)).toBeLessThan(1);
      await page.waitForFunction(() => document.documentElement.dataset.splash === "done", null, { timeout: 5000 });
    } finally {
      await close();
    }
  });

  it("takes the native splash down on the first painted frame, with the sequence and without it", async () => {
    for (const gate of [true, false]) {
      const { page, close } = await open({}, { gate, slowImage: 3000 });
      try {
        await page.waitForFunction(() => (window as unknown as { __hides: unknown[] }).__hides.length > 0, null, { timeout: 2000 });
        const hides = await page.evaluate(() => (window as unknown as { __hides: { method: string; loaded: boolean }[] }).__hides);
        expect(hides).toHaveLength(1);
        expect(hides[0]).toMatchObject({ plugin: "SplashScreen", method: "hide", loaded: false });
      } finally {
        await close();
      }
    }
  });
});
