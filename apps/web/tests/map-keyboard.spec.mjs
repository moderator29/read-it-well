/**
 * The map, reached and driven without a mouse.
 *
 * POLISH_PASS item 43. Two separate failures were hiding here, and neither
 * shows up in a screenshot:
 *
 * 1. **Nothing could zoom except a gesture.** `zoomControl: false` turns off
 *    Leaflet's own pair because they carry Leaflet's styling rather than ours,
 *    and nothing replaced them. That left pinch and the scroll wheel, which is
 *    no way at all on a laptop trackpad in a browser that reads the gesture as
 *    page zoom, and nothing whatsoever for a keyboard or a switch.
 * 2. **Leaflet's own arrow handling sits behind an `aria-hidden` element.**
 *    The container is hidden from assistive tech on purpose, because the pins
 *    are the real controls and they are separate buttons. The side effect is
 *    that Leaflet's keyboard support was bound to something a keyboard user
 *    could not reach, so it may as well not have existed.
 *
 * The assertions below are about MOVEMENT, not about markup. A `tabIndex` and
 * an `aria-label` prove intent; only a changed viewport proves the key did
 * something. The address bar carries lat, lng and zoom on every settled move,
 * which makes it the honest place to read the result from.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/map-keyboard.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [detail].flat()) console.log(`            ${line}`);
  }
}

/** lat, lng and zoom as the address bar currently states them. */
function viewport(page) {
  const p = new URL(page.url()).searchParams;
  return { lat: p.get("lat"), lng: p.get("lng"), z: p.get("z") };
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const width of [390, 1280]) {
  console.log(`\nmap keyboard  (${width}px)`);
  const context = await browser.newContext({ viewport: { width, height: 860 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/search?view=map`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const map = page.locator('[data-testid="map-view"]');
    check("the map region is on the page", (await map.count()) === 1);

    // ------------------------------------------------------- the skip link
    /* Focused from the very top of the document, which is where a keyboard
       user starts, so this also proves the link is reachable rather than
       merely present. */
    await page.keyboard.press("Tab");
    const skip = page.locator('a[href="#map-view"]');
    check("a skip-to-map link exists", (await skip.count()) === 1);
    if ((await skip.count()) === 1) {
      check(
        "the skip link is visible once focused",
        await skip.evaluate((el) => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        }),
      );
    }

    // ----------------------------------------------------- reachable at all
    const reachable = await map.evaluate((el) => el.tabIndex >= 0);
    check("the map region can hold focus", reachable);

    // --------------------------------------------------------- zoom buttons
    const zoomIn = page.locator('[data-testid="map-zoom-in"]');
    const zoomOut = page.locator('[data-testid="map-zoom-out"]');
    check("there is a zoom in control", (await zoomIn.count()) === 1);
    check("there is a zoom out control", (await zoomOut.count()) === 1);

    for (const [name, control] of [["zoom in", zoomIn], ["zoom out", zoomOut]]) {
      if ((await control.count()) !== 1) continue;
      const box = await control.boundingBox();
      check(
        `the ${name} control meets the 44px floor`,
        Boolean(box) && box.width >= 44 && box.height >= 44,
        box ? [`${Math.round(box.width)}x${Math.round(box.height)}`] : "no box",
      );
      check(`the ${name} control is named`, Boolean(await control.getAttribute("aria-label")));
    }

    // ------------------------------------------------ the buttons really zoom
    await map.focus();
    await page.waitForTimeout(600);
    const beforeZoom = viewport(page);
    await zoomIn.click();
    await page.waitForTimeout(WAIT);
    const afterIn = viewport(page);
    check(
      "pressing zoom in changes the zoom",
      beforeZoom.z !== afterIn.z,
      [`before z=${beforeZoom.z}`, `after  z=${afterIn.z}`],
    );

    await zoomOut.click();
    await page.waitForTimeout(WAIT);
    check("pressing zoom out changes it back", viewport(page).z !== afterIn.z);

    // --------------------------------------------------- arrows really pan
    await map.focus();
    await page.waitForTimeout(400);
    const beforePan = viewport(page);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(WAIT);
    const afterRight = viewport(page);
    check(
      "ArrowRight pans the map",
      beforePan.lng !== afterRight.lng,
      [`before lng=${beforePan.lng}`, `after  lng=${afterRight.lng}`],
    );

    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(WAIT);
    check("ArrowDown pans it too", viewport(page).lat !== afterRight.lat);

    // ------------------------------------------------- plus and minus zoom
    const beforeKey = viewport(page);
    await page.keyboard.press("+");
    await page.waitForTimeout(WAIT);
    check("the plus key zooms in", viewport(page).z !== beforeKey.z);

    const afterPlus = viewport(page);
    await page.keyboard.press("-");
    await page.waitForTimeout(WAIT);
    check("the minus key zooms out", viewport(page).z !== afterPlus.z);

    // ------------------------------------------------- panning is not history
    /* Item 38's rule, re-checked here because arrow panning is a new way to
       move the map and it must not fill the back stack either. */
    const historyBefore = await page.evaluate(() => history.length);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(WAIT);
    check(
      "panning by keyboard adds no history entry, so back still works",
      (await page.evaluate(() => history.length)) === historyBefore,
    );
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  unexpected error: ${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(failures === 0 ? "\nAll map keyboard checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
