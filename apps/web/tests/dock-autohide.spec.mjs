/**
 * The dock steps out of the way, and comes straight back.
 *
 * Item 30 of docs/POLISH_PASS.md, inbox item 212. Measured by scrolling a real
 * page in a real browser at 390px and reading where the dock actually is,
 * because "it has a transform on it" is not the same claim as "it left the
 * screen and the reader got the space".
 *
 * What is checked:
 *
 *   1. It is there when the screen opens, before anything has scrolled.
 *   2. Scrolling down takes it off the screen. Off, measured against the
 *      viewport, not merely styled differently.
 *   3. Scrolling up brings it back, immediately, with nothing to wait for.
 *   4. It does not hide in the top of the page, where a disappearing dock
 *      reads as a fault rather than as an affordance.
 *   5. It does not hide at the end of a page, so somebody at the bottom of a
 *      list can still leave.
 *   6. A hidden dock is out of the tab order. A control that has left the
 *      screen and kept its focusability puts five invisible destinations
 *      between the reader and whatever comes next.
 *   7. It is present again on the next screen, however the last one was left.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/dock-autohide.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 8)) console.log(`            ${line}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
});
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("nf_theme", "dark");
  } catch {
    /* storage can be unavailable */
  }
});

const page = await context.newPage();

/** Where the dock sits relative to the bottom of the viewport, and whether it counts. */
const readDock = () =>
  page.evaluate(() => {
    const dock = document.querySelector(".nf-dockrow");
    if (!dock) return null;
    const r = dock.getBoundingClientRect();
    const cs = getComputedStyle(dock);
    return {
      top: r.top,
      bottom: r.bottom,
      viewport: window.innerHeight,
      /* Off the screen means its top edge has passed the bottom of the
         viewport, whatever the opacity is doing. */
      offScreen: r.top >= window.innerHeight,
      visibility: cs.visibility,
      marked: dock.getAttribute("data-dock-hidden"),
      scrollY: window.scrollY,
      scrollable: document.documentElement.scrollHeight > window.innerHeight + 200,
    };
  });

/* A real scroll, then a frame for the rAF-coalesced handler and the
   transition to finish. */
const scrollBy = async (dy) => {
  await page.evaluate((d) => window.scrollBy(0, d), dy);
  await page.waitForTimeout(400);
};

try {
  /*
   * /home, because it is the tallest screen the dock appears on that is tall
   * from its own designed content rather than from inventory. /search would be
   * the honest choice for "somebody is reading a list" and it is 1,032px with
   * an empty catalogue, which is 188px of scroll: not enough to scroll past.
   * This spec would then skip on every run and prove nothing, so it reads the
   * behaviour on a screen that is genuinely long today.
   */
  await page.goto(`${BASE_URL}/home`, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(900);

  console.log("\nThe dock on /home");

  let dock = await readDock();
  check("the dock is on the screen when it opens", dock !== null && !dock.offScreen, [
    dock === null ? "no .nf-dockrow found" : `top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);

  if (dock === null || !dock.scrollable) {
    console.log("\n  SKIPPED: /home is not tall enough to scroll at 390px,");
    console.log("  so there is nothing to scroll past and nothing to measure.");
    console.log("  This is the deliberate empty-catalogue skip, not a pass.");
    await context.close();
    await browser.close();
    process.exit(failures === 0 ? 0 : 1);
  }

  /* 4. Nothing happens in the first stretch of the page. */
  await scrollBy(60);
  dock = await readDock();
  check("a small scroll near the top does not hide it", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)}`,
  ]);

  /* 2. Down, properly. */
  await scrollBy(500);
  dock = await readDock();
  check("scrolling down takes it off the screen", dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);
  check("and out of the tab order", dock.visibility === "hidden", [
    `visibility: ${dock.visibility}`,
  ]);

  /* 6. Properly out of the tab order: nothing inside it can be focused. */
  const reachable = await page.evaluate(() => {
    const dockEl = document.querySelector(".nf-dockrow");
    const links = [...dockEl.querySelectorAll("a")];
    links[0]?.focus();
    return document.activeElement !== null && dockEl.contains(document.activeElement);
  });
  check("a hidden dock cannot take focus", reachable === false);

  /* 3. Up, and back. */
  await scrollBy(-200);
  dock = await readDock();
  check("scrolling up brings it straight back", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)}`,
  ]);
  check("and it is inside the viewport, not merely styled", dock.bottom <= dock.viewport + 1, [
    `bottom ${Math.round(dock.bottom)} of ${dock.viewport}`,
  ]);

  /*
   * 5. The end of the page.
   *
   * `html` sets `scroll-behavior: smooth`, so this is an animation and not a
   * jump, and the last few frames of it are one and two pixel steps. That is
   * the point of testing it this way rather than setting scrollTop by hand: it
   * is how a real thumb arrives at the foot of a page, and the first version
   * of the dock failed it, leaving the dock hidden at the very end of a list
   * with no way to bring it back but scrolling up again.
   */
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(900);
  dock = await readDock();
  check("it does not hide at the end of the page", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);

  /*
   * 7. A new screen starts with it present, and the navigation is a real
   * client-side one from a link inside the page, not a fresh load. That is the
   * case that can actually go wrong: the component stays mounted across an app
   * navigation, so a dock left hidden stays hidden unless something resets it,
   * and a back navigation restores the scroll position without firing a scroll
   * event for the handler to notice.
   */
  console.log("\nAcross a navigation");
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(400);
  const beforeLeaving = await readDock();
  check("the dock is hidden at the moment the screen is left", beforeLeaving.offScreen, [
    `dock top ${Math.round(beforeLeaving.top)} of ${beforeLeaving.viewport}`,
  ]);

  await page.evaluate(() => {
    document.querySelector('main a[href="/search"]')?.click();
  });
  await page.waitForURL("**/search", { timeout: 20000 });
  await page.waitForTimeout(900);
  dock = await readDock();
  check("the next screen opens with the dock in place", dock !== null && !dock.offScreen, [
    `left the last screen ${beforeLeaving.offScreen ? "hidden" : "showing"}`,
    dock === null ? "no dock" : `dock top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);
} finally {
  await context.close();
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
