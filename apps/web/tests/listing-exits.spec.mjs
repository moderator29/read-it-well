/**
 * A PERSON CAN ALWAYS LEAVE A LISTING (track D, 25 September 2026).
 *
 * The founder reported being unable to leave the listing page. Measured: the
 * only back control sat on the photograph and scrolled away with it, the page
 * hides the dock, and browser back while the photo viewer was open left the
 * listing entirely. This walks the fixes on an iPhone-class phone (390x844,
 * deviceScaleFactor 3, touch, mobile) with REAL touch gestures through the
 * DevTools protocol, so the browser's own scroll and gesture code runs:
 *
 *   - the viewer's close control is 44px and sits at the top edge;
 *   - browser back closes the viewer first and stays on the listing;
 *   - X and Escape close it without leaving a dead history entry;
 *   - a short drag down springs back, a long one dismisses; sideways pages;
 *   - the page scrolls afterwards (no scroll lock left behind);
 *   - once scrolled, a 44px back is on screen (the stuck section tabs on a
 *     property, a fixed back on a stay and a restaurant) and it leaves;
 *   - opened with no history, back falls back to the listing's parent.
 *
 * Signed in, because the catalogue is behind the gate. Credentials come from
 * the environment only (QA_MEMBER_EMAIL, and QA_MEMBER_PASSWORD or
 * QA_PASSWORD) and are never written anywhere.
 *
 *   BASE_URL=http://localhost:3000 node apps/web/tests/listing-exits.spec.mjs
 */
import { chromium } from "playwright-core";
import { markEveryTab, passcodeReady } from "./_passcode.mjs";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const LISTING = process.env.LISTING_PATH ?? "/listing/ed000000-0000-4000-8000-00000000002b";
const STAY = process.env.STAY_PATH ?? "/stay/ea000000-0000-4000-8000-000000000003";
const RESTAURANT = process.env.RESTAURANT_PATH ?? "/restaurant/eb000000-0000-4000-8000-000000000006";
const EXECUTABLE = ["/opt/pw-browsers/chromium"].find(existsSync);
const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

let failures = 0;
function check(name, condition) {
  console.log(`  ${condition ? "ok    " : "FAILED"}  ${name}`);
  if (!condition) failures += 1;
}

async function swipe(page, { x0, y0, x1, y1, steps = 14, ms = 240 }) {
  const cdp = await page.context().newCDPSession(page);
  const at = (x, y) => [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: at(x0, y0) });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: at(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t) });
    await page.waitForTimeout(ms / steps);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function signIn(browser) {
  const email = process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_MEMBER_PASSWORD ?? process.env.QA_PASSWORD;
  if (!email || !password) {
    console.error("listing-exits: set QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD (or QA_PASSWORD).");
    process.exit(2);
  }
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.fill("#auth-email", email);
  await page.click("button:has-text('Continue')");
  await page.waitForSelector("#password", { timeout: 30_000 });
  await page.fill("#password", password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 });
  /* The passcode layer (docs/PASSCODE.md): set or type the QA code, and take the unlock cookie into the state. */
  await passcodeReady(ctx, page, { baseUrl: BASE });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const state = await signIn(browser);

for (const reducedMotion of ["no-preference", "reduce"]) {
  console.log(`\n== the photo viewer (${reducedMotion})`);
  const ctx = await browser.newContext({ ...PHONE, storageState: state, reducedMotion });
  await markEveryTab(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/search`, { waitUntil: "load" });
  await page.goto(`${BASE}${LISTING}`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const here = page.url();
  const viewer = () => page.locator("[data-testid=listing-lightbox]").count();
  const opener = page.locator("[data-testid=gallery-open]").first();

  await opener.tap();
  await page.waitForTimeout(700);
  const close = await page.locator("[data-testid=lightbox-close]").boundingBox();
  check("the close control is 44 by 44", close.width >= 44 && close.height >= 44);
  check(`the close control sits at the top edge (y ${Math.round(close.y)})`, close.y <= 20);
  await page.goBack();
  await page.waitForTimeout(900);
  check("browser back closes the viewer first", (await viewer()) === 0);
  check("and stays on the listing", page.url() === here);

  await opener.tap();
  await page.waitForTimeout(700);
  await page.locator("[data-testid=lightbox-close]").tap();
  await page.waitForTimeout(900);
  check("X closes", (await viewer()) === 0);
  check("X leaves no dead history entry", (await page.evaluate(() => history.state?.nfPhotoViewer)) !== true);

  await opener.tap();
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(900);
  check("Escape closes", (await viewer()) === 0);

  await opener.tap();
  await page.waitForTimeout(700);
  await swipe(page, { x0: 195, y0: 300, x1: 198, y1: 400 });
  await page.waitForTimeout(700);
  check("a short drag down springs back", (await viewer()) === 1);
  await swipe(page, { x0: 195, y0: 250, x1: 200, y1: 650, steps: 16, ms: 260 });
  await page.waitForTimeout(900);
  check("a long drag down dismisses", (await viewer()) === 0);
  check("still on the listing", page.url() === here);

  await opener.tap();
  await page.waitForTimeout(700);
  await swipe(page, { x0: 340, y0: 420, x1: 50, y1: 424, steps: 20, ms: 300 });
  await page.waitForTimeout(900);
  const counter = await page.locator("[data-testid=listing-lightbox] p.nf-numeric").textContent();
  check(`a sideways swipe pages (${counter.trim()})`, /\b2 \//.test(counter));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  check("nothing left the body locked", (await page.evaluate(() => document.body.style.overflow)) === "");

  const grid = page.locator("[data-testid=listing-photo-grid]");
  if ((await grid.count()) > 0) {
    await grid.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const y = await page.evaluate(() => scrollY);
    await grid.locator("ul button").first().tap();
    await page.waitForTimeout(700);
    await page.locator("[data-testid=lightbox-close]").tap();
    await page.waitForTimeout(1000);
    check("closing a photo opened mid-page keeps the reader's place", Math.abs((await page.evaluate(() => scrollY)) - y) < 4);
    await page.locator("[data-testid=photos-show-all]").tap();
    await page.waitForTimeout(1000);
    await page.getByRole("dialog").locator("ul button").nth(1).tap();
    await page.waitForTimeout(900);
    check("a photo opens from the Show all sheet", (await viewer()) === 1);
    await page.goBack();
    await page.waitForTimeout(1200);
    check("back closes it, and the sheet with it", (await viewer()) === 0 && (await page.getByRole("dialog").count()) === 0);
    check("still on the listing after the sheet round trip", page.url() === here);
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
  }
  await swipe(page, { x0: 200, y0: 700, x1: 200, y1: 120 });
  await page.waitForTimeout(700);
  await swipe(page, { x0: 200, y0: 700, x1: 200, y1: 120 });
  await page.waitForTimeout(900);
  check("the page scrolls", (await page.evaluate(() => scrollY)) > 300);
  const back = page.locator("[data-testid=tabs-back]");
  const box = await back.boundingBox();
  const shown = await back.evaluate((el) => getComputedStyle(el).opacity === "1" && !el.inert);
  check("scrolled, the stuck tabs carry a 44px back on screen", shown && box.width >= 44 && box.y >= 0 && box.y < 80);
  await back.tap();
  await page.waitForTimeout(2500);
  check(`and it leaves the listing (${new URL(page.url()).pathname})`, page.url() !== here);
  await ctx.close();
}

for (const [label, path, parent] of [
  ["stay", STAY, "/stays"],
  ["restaurant", RESTAURANT, "/restaurants"],
]) {
  console.log(`\n== a ${label}, opened with no history`);
  const ctx = await browser.newContext({ ...PHONE, storageState: state });
  await markEveryTab(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  const floating = page.locator("[data-testid=floating-back]");
  check("at the top the fixed back is hidden and inert", await floating.evaluate((el) => el.inert && getComputedStyle(el).opacity === "0"));
  await swipe(page, { x0: 200, y0: 700, x1: 200, y1: 120 });
  await page.waitForTimeout(1200);
  const box = await floating.boundingBox();
  check("scrolled, a 44px back is on screen", (await floating.evaluate((el) => !el.inert)) && box.width >= 44 && box.y >= 0 && box.y < 80);
  await floating.tap();
  await page.waitForTimeout(2500);
  check(`with no history it falls back to ${parent} (${new URL(page.url()).pathname})`, new URL(page.url()).pathname === parent);
  await ctx.close();
}

await browser.close();
console.log(failures === 0 ? "\nlisting-exits: all passed" : `\nlisting-exits: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
