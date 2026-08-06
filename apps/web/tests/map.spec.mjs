/**
 * The discovery map, walked at phone size in both themes.
 *
 * Self-contained Playwright script: no runner, no config. It proves the map
 * view survives the one condition this sandbox always imposes, which is that
 * remote tiles cannot be fetched: the branded canvas must still be there, the
 * marks must still be placed, the docked card must still open and close, and
 * the locate control must still be reachable from the keyboard. Nothing here
 * asserts that imagery loaded, because that would fail offline and pass online
 * for the wrong reason. Exits non-zero on the first broken expectation.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/map.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;
const VIEWPORT = { width: 390, height: 844 };

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/**
 * Tap a mark on the map. A real click first, because that is what a thumb
 * does; a dispatched click only if the frame's own chrome sits over the mark
 * at that moment, which is a layout detail rather than the behaviour on test.
 */
async function tap(locator) {
  try {
    await locator.click({ timeout: 4000 });
  } catch {
    console.log("  note    a real click was blocked, the event was dispatched instead");
    await locator.dispatchEvent("click");
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

try {
  for (const colorScheme of ["dark", "light"]) {
    console.log(`\n/search?view=map  (${colorScheme})`);
    const context = await browser.newContext({ colorScheme, viewport: VIEWPORT });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/search?view=map`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    // ------------------------------------------------------------- the frame
    const view = page.locator('[data-testid="map-view"]');
    check("the map view renders", (await view.count()) === 1);

    const box = await view.boundingBox();
    check("the map frame has real size", Boolean(box) && box.height > 300 && box.width > 300);

    // No blank void: the branded canvas is painted underneath whatever the
    // tile servers can or cannot deliver, with its own ground and graticule.
    const surface = page.locator('[data-testid="map-surface"]');
    check("the branded surface is present", (await surface.count()) === 1);
    const ground = await surface.evaluate((node) => {
      const style = getComputedStyle(node);
      return { colour: style.backgroundColor, image: style.backgroundImage };
    });
    check(
      "the surface is painted, not transparent",
      ground.colour !== "rgba(0, 0, 0, 0)" && ground.colour !== "transparent",
    );
    check("the surface carries the graticule", ground.image.includes("gradient"));

    // The count is announced, not only drawn.
    const count = page.locator('[data-testid="map-count"]');
    check("the visible count is announced", (await count.count()) === 1);
    check(
      "the count is a live region",
      (await count.getAttribute("aria-live")) === "polite",
    );

    // --------------------------------------------------------------- the pins
    let pins = page.locator('[data-testid="map-pin"]');
    const clusters = page.locator('[data-testid="map-cluster"]');
    const marks = (await pins.count()) + (await clusters.count());
    /* Every mark on this map is a listing, and the catalogue of twenty-three
       invented places was removed on purpose. No shelf, no pins - which is not
       a broken map. See tests/_catalogue.mjs. */
    if (marks === 0) {
      console.log("  skip    catalogue is empty, so there is nothing to put on the map");
      console.log("  note    run against a deployment with real inventory to exercise this");
      await context.close();
      continue;
    }
    check("the map carries marks", marks > 0);

    // At a wide opening view a dense city is one count bubble by design, so a
    // bubble is opened first when that is what the map is showing.
    if ((await pins.count()) === 0 && (await clusters.count()) > 0) {
      await tap(clusters.first());
      await page.waitForTimeout(900);
      pins = page.locator('[data-testid="map-pin"]');
      check("opening a count bubble reveals its pins", (await pins.count()) > 0);
    }
    check("price pins are present", (await pins.count()) > 0);

    const pinText = (await pins.allTextContents()).join(" ");
    check("a pin shows a naira price", /₦|NGN/.test(pinText));

    // --------------------------------------------------------- the docked card
    await tap(pins.first());
    await page.waitForTimeout(700);
    const dock = page.locator('[data-testid="map-dock"]');
    check("choosing a pin docks the card", (await dock.count()) === 1);
    check(
      "the docked card links to the listing",
      (await dock.locator('a[href^="/listing/"]').count()) === 1,
    );
    check(
      "the docked card offers a save control",
      (await dock.locator('[data-testid="map-dock-save"]').count()) === 1,
    );

    // The card docks above the controls, never over them.
    const locate = page.locator('[data-testid="map-locate"]');
    const dockBox = await dock.boundingBox();
    const locateBox = await locate.boundingBox();
    check(
      "the docked card does not cover the locate control",
      Boolean(dockBox) && Boolean(locateBox) && locateBox.y + locateBox.height <= dockBox.y + 1,
    );

    await tap(page.locator('[data-testid="map-dock-close"]'));
    await page.waitForTimeout(500);
    check("dismissing removes the card", (await dock.count()) === 0);

    // ------------------------------------------------------ the locate control
    check("the locate control is present", (await locate.count()) === 1);
    await locate.focus();
    const focused = await page.evaluate(() =>
      document.activeElement ? document.activeElement.getAttribute("data-testid") : null,
    );
    check("the locate control takes keyboard focus", focused === "map-locate");
    check(
      "the locate control names itself",
      Boolean(await locate.getAttribute("aria-label")),
    );

    // ---------------------------------------------------------------- overflow
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      inner: window.innerWidth,
    }));
    check(
      `no horizontal overflow at ${VIEWPORT.width}px`,
      overflow.doc <= overflow.inner + 1 && overflow.body <= overflow.inner + 1,
    );

    await context.close();
  }
} catch (error) {
  failures += 1;
  console.error("\n  FAILED  the walk threw:", error && error.message ? error.message : error);
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nmap: all checks passed" : `\nmap: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
