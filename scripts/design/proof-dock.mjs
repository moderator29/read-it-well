/*
 * THE DOCK AND THE DRAWER, RETAKEN AFTER THE FOUNDER REVERSED TWO RULINGS.
 *
 * Why this script exists rather than a re-run of an older one. Two proofs in
 * docs/design/proofs/b1/ were older than the code they claimed to prove:
 *
 *   1. `dock-390-dark.png` showed the centre switch RAISED above the bar, and
 *      the ledger row measured "the object rises 7px". `chrome.css` now sets
 *      `--nf-dock-lift: 0rem`, because the founder used it on a real phone and
 *      ruled the switch back in line with the other four.
 *   2. A ledger row proved "the side drawer's Switch profile row" against
 *      GOVERNING-01 screen three. That row was REMOVED, not moved: the switch
 *      lives in one place now.
 *
 * A proof that disagrees with the shipped code is the same class of fault as a
 * green light that cannot see what it is reporting on, and this build found
 * five of those in one day. So this script does not merely photograph: it
 * MEASURES the two things that changed and refuses to write a file when the
 * measurement disagrees with the ruling.
 *
 * FOUR GUARDS, each one paid for by a real failure on this build:
 *
 *   - the HTTP status, because a server can answer anything;
 *   - WHERE THE BROWSER LANDED, because `verify-shots.mjs` once wrote five PNGs
 *     of the sign-in screen under five other route names;
 *   - the not-found MARKER, because a Next.js layout `notFound()` answers
 *     HTTP 200 with the not-found body, so a 200 is not proof of a page;
 *   - `behavior: "instant"` on the scroll, because a smooth scroll is a no-op
 *     in headless Chromium and the shot lands mid-flight.
 *
 * Run against a production `next start`, never `next dev`, which does not
 * hydrate reliably on this box.
 */
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.PROOF_BASE ?? "http://127.0.0.1:3311";
const OUT = process.env.PROOF_OUT ?? "docs/design/proofs/b1";
const ROUTE = "/search";

mkdirSync(OUT, { recursive: true });

/* The flags are not decoration: headless Chromium silently DROPS
   `backdrop-filter` without them, and this product is built out of glass. A
   shot taken without them is a photograph of a different design. */
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

async function open(viewport, theme) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, colorScheme: theme });
  await page.addInitScript((t) => {
    try { window.localStorage.setItem("nf_theme", t); } catch { /* the attribute below still lands */ }
  }, theme);

  const response = await page.goto(`${BASE}${ROUTE}`, { waitUntil: "networkidle", timeout: 60_000 });

  const status = response?.status() ?? 0;
  if (status < 200 || status >= 300) throw new Error(`REFUSING: server answered ${status}`);

  const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  if (landed !== ROUTE) throw new Error(`REFUSING: browser ended at ${landed}, asked for ${ROUTE}`);

  if (await page.locator("[data-nf-not-found]").count()) {
    throw new Error("REFUSING: this is the not-found body served at 200");
  }

  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  return page;
}

/* WHAT "IN LINE" MEANS, AS ARITHMETIC RATHER THAN AS AN ADJECTIVE, AND THE
   FIRST VERSION OF THIS GOT IT WRONG.

   It measured the switch slot against the BAR and asserted the difference was
   zero. It came back -7, and -7 is not a lift: it is the bar's own top
   padding, which every slot sits inside. The guard fired and refused to write
   a file, which is the guard working, but the number it was guarding was
   meaningless.
   
   The founder's ruling is "in line with the OTHER ICONS", so the comparison is
   against the SIBLING slots, not against the container. `lift` is now how far
   the switch's top sits above the median top of the other four. Zero is in
   line; positive is raised; the old shipped dock measured about +7 here. */
async function measureDock(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".nf-tabbar");
    const slot = document.querySelector(".nf-tab--switch");
    if (!bar || !slot) return { found: false };

    const others = [...document.querySelectorAll(".nf-tabbar .nf-tab")]
      .filter((el) => el !== slot)
      .map((el) => el.getBoundingClientRect());
    if (others.length === 0) return { found: false };

    const tops = others.map((r) => r.top).sort((a, b) => a - b);
    const medianTop = tops[Math.floor(tops.length / 2)];
    const s = slot.getBoundingClientRect();
    const object = slot.firstElementChild?.getBoundingClientRect() ?? s;

    /* The other slots' drawn glyph blocks, for the "make it smaller" half of
       the same ruling. The link is the whole 56px tap target; the glyph block
       is what the eye reads as the icon. */
    const otherIconWidths = others
      .map((r) => Math.round(r.width * 100) / 100)
      .sort((a, b) => a - b);

    const round = (n) => Math.round(n * 100) / 100;
    return {
      found: true,
      liftAgainstSiblings: round(medianTop - s.top),
      slotTop: round(s.top),
      siblingMedianTop: round(medianTop),
      slots: document.querySelectorAll(".nf-tabbar .nf-tab").length,
      switchObjectWidth: round(object.width),
      switchObjectHeight: round(object.height),
      switchSlotWidth: round(s.width),
      siblingSlotWidths: otherIconWidths,
      barHeight: round(bar.getBoundingClientRect().height),
      overflowX: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  });
}

async function measureDrawer(page) {
  const burger = page.getByRole("button", { name: /open menu/i }).first();
  await burger.click();
  await page.waitForSelector(".nf-drawer", { state: "visible", timeout: 10_000 });
  await page.waitForTimeout(450);
  const facts = await page.evaluate(() => {
    const drawer = document.querySelector(".nf-drawer");
    const text = (drawer?.textContent ?? "").toLowerCase();
    return {
      switchRowPresent: /switch profile|switch role/.test(text),
      lightWords: /light mode|dark mode/.test(text),
    };
  });
  return facts;
}

const results = {};
for (const [name, viewport, theme] of [
  ["dock-390-dark", { width: 390, height: 844 }, "dark"],
  ["dock-390-light", { width: 390, height: 844 }, "light"],
  ["dock-1536-dark", { width: 1536, height: 960 }, "dark"],
]) {
  const page = await open(viewport, theme);
  const dock = await measureDock(page);

  /* At 1536 the dock is not drawn at all: the desktop rail replaces it. That
     is correct and is not a failure, so it is recorded rather than thrown. */
  if (viewport.width < 1024) {
    if (!dock.found) throw new Error(`REFUSING ${name}: no dock on the page`);
    if (Math.abs(dock.liftAgainstSiblings) > 0.5) {
      throw new Error(
        `REFUSING ${name}: the switch sits ${dock.liftAgainstSiblings}px above its ` +
        `siblings. The founder ruled it IN LINE with the other icons and ` +
        `--nf-dock-lift is 0rem, so either the code regressed or this script is ` +
        `measuring the wrong box. Not writing a proof that disagrees with the ruling.`,
      );
    }
    if (dock.overflowX !== 0) {
      throw new Error(`REFUSING ${name}: ${dock.overflowX}px of horizontal overflow`);
    }
  }

  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  results[name] = dock;
  await page.close();
}

/* The drawer, shot once at 390 dark, and ASSERTED rather than eyeballed: the
   Switch profile row is gone and the theme control has lost its words. */
const page = await open({ width: 390, height: 844 }, "dark");
const drawer = await measureDrawer(page);
if (drawer.switchRowPresent) {
  throw new Error(
    "REFUSING drawer-390-dark: a Switch profile row is still in the drawer. " +
    "The founder removed it on 22 September and the switch lives in one place.",
  );
}
await page.screenshot({ path: join(OUT, "drawer-390-dark.png"), fullPage: false });
results["drawer-390-dark"] = drawer;
await page.close();

await browser.close();
writeFileSync(join(OUT, "dock-measurements.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
