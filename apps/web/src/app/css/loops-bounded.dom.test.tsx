/**
 * THE LAST LOOPS ARE BOUNDED, IN CHROMIUM (Session 3, C1; MOTION_SYSTEM
 * principle 10: nothing loops forever except the aurora and the assistant's
 * thinking state). The skeleton shimmers, the landing columns and the docs flow
 * pulse run a fixed number of times and rest, and a quiet reader (reduced
 * motion, Calm, Off, data saver) gets the same resting state without the motion.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(
  "app/css/controls.css",
  "app/social.css",
  "app/css/cinema.css",
  "app/css/docs-motion.css",
  "app/css/animation.css",
  "app/css/data-saver.css",
  "app/css/motion-pref.css",
);

const entryWith = (saver: boolean) => `
  import { mount } from "@/lib/testing/browser-root";
  ${saver ? `document.documentElement.setAttribute("data-save-data", "on");` : ""}
  mount(<div>
    <div id="sk" className="nf-skeleton" style={{ width: 300, height: 24 }} />
    <div id="skg" className="nf-skeleton nf-skeleton--glass" style={{ width: 300, height: 24 }} />
    <div id="soc" className="nf-social-skeleton" style={{ width: 300, height: 24 }} />
    <div className="nf-vcols"><div className="nf-vcols__col" data-col="0"><div id="strip" className="nf-vcols__strip" /></div></div>
    <div style={{ position: "relative", width: 600, height: 40 }}><span id="pulse" className="nf-flow__pulse" /></div>
  </div>);
`;

const VIEW = { width: 1000, height: 800 };
const SELECTORS = ["#sk", "#skg", "#soc", "#strip", "#pulse"] as const;

const style = (page: Page, sel: string, prop: string) =>
  page.evaluate(([s, p]) => (getComputedStyle(document.querySelector(s!)!) as unknown as Record<string, string>)[p!], [sel, prop] as const);

/** Run every animation to its end now, as the clock would, and report the resting background positions. */
const settle = (page: Page) =>
  page.evaluate(() => {
    for (const a of document.getAnimations()) a.finish();
    const pos = (s: string) => getComputedStyle(document.querySelector(s)!).backgroundPosition;
    return { sk: pos("#sk"), skg: pos("#skg"), soc: pos("#soc") };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the last loops are bounded", () => {
  it("every one runs a fixed number of times, none infinite", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith(false), css: CSS, viewport: VIEW });
    try {
      const counts: Record<string, string> = {};
      for (const sel of SELECTORS) counts[sel] = String(await style(page, sel, "animationIterationCount"));
      expect(counts).toEqual({ "#sk": "4", "#skg": "4", "#soc": "4", "#strip": "2", "#pulse": "2" });
      expect(await style(page, "#sk", "animationFillMode")).toBe("forwards");
      expect(await style(page, "#soc", "animationFillMode")).toBe("forwards");
    } finally {
      await close();
    }
  });

  it("the skeletons settle to the tint a still slab has (the same in the glass and social slabs)", async () => {
    const standard = await mountInBrowser({ entry: entryWith(false), css: CSS, viewport: VIEW });
    const saver = await mountInBrowser({ entry: entryWith(true), css: CSS, viewport: VIEW });
    try {
      const ran = await settle(standard.page);
      /* Data saver never starts them: the slab is at its base position. */
      const still = await saver.page.evaluate(() => {
        const pos = (s: string) => getComputedStyle(document.querySelector(s)!).backgroundPosition;
        return { sk: pos("#sk"), skg: pos("#skg"), soc: pos("#soc") };
      });
      expect(ran).toEqual(still);
      expect(still.sk).toBe("117.3% 0px");
      expect(still.skg).toBe("117.3% 0px");
      expect(still.soc).toBe("-40% 0px");
    } finally {
      await standard.close();
      await saver.close();
    }
  });

  it("data saver starts none of them", async () => {
    const { page, close } = await mountInBrowser({ entry: entryWith(true), css: CSS, viewport: VIEW });
    try {
      for (const sel of ["#sk", "#skg", "#soc", "#strip"]) expect(await style(page, sel, "animationName"), sel).toBe("none");
    } finally {
      await close();
    }
  });

  it("reduced motion, Calm and Off run them at most once and leave the same still tint", async () => {
    const quiet: { name: string; opts: Record<string, unknown> }[] = [
      { name: "reduced", opts: { reducedMotion: true } },
      { name: "calm", opts: { motion: "calm" } },
      { name: "off", opts: { motion: "off" } },
    ];
    for (const { name, opts } of quiet) {
      const { page, close } = await mountInBrowser({ entry: entryWith(false), css: CSS, viewport: VIEW, ...opts });
      try {
        for (const sel of SELECTORS) {
          expect(await style(page, sel, "animationIterationCount"), `${name} ${sel}`).toMatch(/^1$|^none$/);
        }
        const rest = await settle(page);
        expect(rest, name).toEqual({ sk: "117.3% 0px", skg: "117.3% 0px", soc: "-40% 0px" });
      } finally {
        await close();
      }
    }
  });
});
