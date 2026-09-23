/**
 * UI-P2-02: the "no horizontal scroll" check, in a real browser.
 *
 * The root and body are `overflow-x: clip`, so `scrollWidth <= innerWidth`
 * holds whatever the page does. This proves that on a page shaped like ours,
 * and proves that `tests/_overflow.mjs` sees what the old check cannot: an
 * element past the right edge (the long-name case), while leaving alone
 * content that a rail or a card contains on purpose.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

type Offender = { element: string; text: string; left: number; right: number; viewport: number };
type OverflowModule = { horizontalOverflow: () => Offender[] };

const ROOT_CLIP = `<style>html,body{margin:0;overflow-x:clip}.card{padding:8px}</style>`;

const PAGES = {
  clean: `${ROOT_CLIP}<div class="card"><span>Ada Obi</span><button>Follow</button></div>`,
  longName: `${ROOT_CLIP}<div class="card"><span class="name">${"A".repeat(200)}</span><button>Follow</button></div>`,
  wideBlock: `${ROOT_CLIP}<main><div style="width:2411px;height:20px">wide</div></main>`,
  rail: `${ROOT_CLIP}<div style="overflow-x:auto"><div style="display:flex;gap:8px">${'<div style="flex:0 0 300px;height:40px">tile</div>'.repeat(6)}</div></div>`,
  clippedCard: `${ROOT_CLIP}<div style="overflow:hidden;width:200px"><div style="width:900px">clipped on purpose</div></div>`,
  srOnly: `${ROOT_CLIP}<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);left:-9999px">skip</span>`,
  closedDrawer: `${ROOT_CLIP}<aside aria-hidden="true" style="position:fixed;left:100%;width:300px;height:100px">menu</aside>`,
};

describe.skipIf(!CHROMIUM)("horizontal overflow with the root clipped (real Chromium)", () => {
  let browser: Browser;
  let page: Page;
  let mod: OverflowModule;

  beforeAll(async () => {
    mod = (await import(pathToFileURL(join(__dirname, "..", "..", "..", "tests", "_overflow.mjs")).href)) as OverflowModule;
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  }, 30_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function load(html: string) {
    await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
    const oldCheckPasses = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    const offenders = await page.evaluate(mod.horizontalOverflow);
    return { oldCheckPasses, offenders };
  }

  it("the old scrollWidth check stays green on a 2411px element: it is blind", async () => {
    const { oldCheckPasses, offenders } = await load(PAGES.wideBlock);
    expect(oldCheckPasses).toBe(true);
    expect(offenders.length).toBe(1);
    expect(offenders[0]?.right).toBeGreaterThan(2000);
  });

  it("reports the long unbroken name that runs past the card (one line, not one per ancestor)", async () => {
    const { oldCheckPasses, offenders } = await load(PAGES.longName);
    expect(oldCheckPasses).toBe(true);
    expect(offenders.map((o) => o.element)).toEqual(["span.name"]);
  });

  it("passes a page that fits", async () => {
    expect((await load(PAGES.clean)).offenders).toEqual([]);
  });

  it("does not count content a rail scrolls or a card clips on purpose", async () => {
    expect((await load(PAGES.rail)).offenders).toEqual([]);
    expect((await load(PAGES.clippedCard)).offenders).toEqual([]);
  });

  it("skips visually hidden text and a closed off-canvas drawer", async () => {
    expect((await load(PAGES.srOnly)).offenders).toEqual([]);
    expect((await load(PAGES.closedDrawer)).offenders).toEqual([]);
  });
});
