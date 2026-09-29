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
 * WHERE. Since 23 September `/home` and `/search` answer a signed-out visitor
 * with the sign-in wall (asserted first). Checks 1 to 6 are then read on the
 * preview harness's search screen (`/preview/session-b/sweep-home/search`,
 * the real AppShell and dock around fixture results, 1,466px tall at 390, so
 * there is a real page to scroll). Check 7 needs a client-side navigation
 * between two real product screens, which only a session can make: it runs
 * signed in as the QA member on `/home` (with 1 to 6 again there) and is
 * reported as SKIP without QA_MEMBER_EMAIL / QA_MEMBER_PASSWORD.
 *
 * Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/dock-autohide.spec.mjs
 */

import { chromium } from "playwright-core";
import { expectSignInWall, openPreview, qaContext, signInAsQa, skip } from "./_gate.mjs";

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

async function darkContext(state) {
  const options = { viewport: { width: 390, height: 844 }, colorScheme: "dark" };
  const context = state ? await qaContext(browser, state, options) : await browser.newContext(options);
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("nf_theme", "dark");
    } catch {
      /* storage can be unavailable */
    }
  });
  return context;
}

/** Where the dock sits relative to the bottom of the viewport, and whether it counts. */
const readDock = (page) =>
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
   transition to finish. `html` scrolls smoothly, so the scroll itself is an
   animation: wait for scrollY to stop moving before the 400ms transition
   wait, or a loaded server reads the dock halfway through its slide. */
const scrollBy = async (page, dy) => {
  await page.evaluate((d) => window.scrollBy(0, d), dy);
  let last = -1;
  for (let i = 0; i < 30; i += 1) {
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) break;
    last = y;
  }
  await page.waitForTimeout(400);
};

/** Checks 1 to 6 on whatever screen `page` has open. False when it cannot scroll. */
async function autohide(page, label) {
  console.log(`\nThe dock on ${label}`);
  let dock = await readDock(page);
  check("the dock is on the screen when it opens", dock !== null && !dock.offScreen, [
    dock === null ? "no .nf-dockrow found" : `top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);
  if (dock === null) return false;
  if (!dock.scrollable) {
    skip(`${label} is not tall enough to scroll at 390px, so there is nothing to scroll past and nothing to measure`);
    return false;
  }

  /* 4. Nothing happens in the first stretch of the page. */
  await scrollBy(page, 60);
  dock = await readDock(page);
  check("a small scroll near the top does not hide it", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)}`,
  ]);

  /* 2. Down, properly. */
  await scrollBy(page, 500);
  dock = await readDock(page);
  check("scrolling down takes it off the screen", dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);
  check("and out of the tab order", dock.visibility === "hidden", [`visibility: ${dock.visibility}`]);

  /* 6. Properly out of the tab order: nothing inside it can be focused. */
  const reachable = await page.evaluate(() => {
    const dockEl = document.querySelector(".nf-dockrow");
    const links = [...dockEl.querySelectorAll("a")];
    links[0]?.focus();
    return document.activeElement !== null && dockEl.contains(document.activeElement);
  });
  check("a hidden dock cannot take focus", reachable === false);

  /* 3. Up, and back. */
  await scrollBy(page, -200);
  dock = await readDock(page);
  check("scrolling up brings it straight back", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)}`,
  ]);
  check("and it is inside the viewport, not merely styled", dock.bottom <= dock.viewport + 1, [
    `bottom ${Math.round(dock.bottom)} of ${dock.viewport}`,
  ]);

  /*
   * 5. The end of the page. `html` sets `scroll-behavior: smooth`, so this is
   * an animation and not a jump, which is how a real thumb arrives at the foot
   * of a page; the first version of the dock failed exactly this.
   */
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(900);
  dock = await readDock(page);
  check("it does not hide at the end of the page", !dock.offScreen, [
    `scrollY ${dock.scrollY}, dock top ${Math.round(dock.top)} of ${dock.viewport}`,
  ]);
  return true;
}

try {
  console.log("signed out");
  await expectSignInWall(check, "/home");
  await expectSignInWall(check, "/search");

  {
    const context = await darkContext(null);
    const page = await context.newPage();
    if (await openPreview(page, "/preview/session-b/sweep-home/search", check, { wait: 900 })) {
      await autohide(page, "/preview/session-b/sweep-home/search");
    }
    await context.close();
  }

  console.log("\nSigned in as the QA member");
  const state = await signInAsQa(browser);
  if (state) {
    const context = await darkContext(state);
    const page = await context.newPage();
    /* /home, because it is the tallest screen the dock appears on that is
       tall from its own designed content rather than from inventory. */
    await page.goto(`${BASE_URL}/home`, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(900);
    if (await autohide(page, "/home")) {
      /*
       * 7. A new screen starts with it present, and the navigation is a real
       * client-side one from a link inside the page, not a fresh load: the
       * component stays mounted across an app navigation, so a dock left
       * hidden stays hidden unless something resets it.
       */
      console.log("\nAcross a navigation");
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.waitForTimeout(300);
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(400);
      const beforeLeaving = await readDock(page);
      check("the dock is hidden at the moment the screen is left", beforeLeaving.offScreen, [
        `dock top ${Math.round(beforeLeaving.top)} of ${beforeLeaving.viewport}`,
      ]);
      await page.evaluate(() => {
        document.querySelector('main a[href="/search"]')?.click();
      });
      await page.waitForURL("**/search", { timeout: 20000 });
      await page.waitForTimeout(900);
      const dock = await readDock(page);
      check("the next screen opens with the dock in place", dock !== null && !dock.offScreen, [
        `left the last screen ${beforeLeaving.offScreen ? "hidden" : "showing"}`,
        dock === null ? "no dock" : `dock top ${Math.round(dock.top)} of ${dock.viewport}`,
      ]);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
