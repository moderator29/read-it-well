/**
 * Discovery filters walkthrough, dark and light.
 *
 * Self-contained Playwright script: no runner, no config. It drives the real
 * /search page at phone size in both themes and proves the filter system is
 * genuine end to end: the control opens the drawer, a budget narrows the
 * results and lands in the address bar, a category tile and an amenity chip
 * both filter, Clear all restores the page exactly, the header count is the
 * number of cards below it, and nothing overflows 390px sideways.
 *
 * Every assertion is relative to a baseline measured on the same run, so the
 * spec is honest whether the catalogue behind it is the seed content alone or
 * seed content blended with real published inventory.
 *
 * Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/filters.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;
const WIDTH = 390;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

/** The number the results header prints, read from its own text. */
async function headerCount(page) {
  const text = await page.locator('[data-testid="results-count"]').innerText();
  const match = text.replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Number.NaN;
}

/** The number of listing cards actually rendered. */
async function cardCount(page) {
  const grid = page.locator('[data-testid="results-grid"]');
  if ((await grid.count()) === 0) return 0;
  return grid.locator("> li").count();
}

/** Widest laid-out element versus the viewport. A phone must never pan. */
async function overflows(page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth > window.innerWidth + 1 ||
      document.body.scrollWidth > window.innerWidth + 1,
  );
}

async function openDrawer(page) {
  await page.locator('[data-testid="filters-open"]').click();
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const colorScheme of ["dark", "light"]) {
  console.log(`\n/search  (${colorScheme})`);
  const context = await browser.newContext({
    colorScheme,
    viewport: { width: WIDTH, height: 844 },
  });
  const page = await context.newPage();

  try {
    // ------------------------------------------------------------ baseline
    await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const baseline = await headerCount(page);
    const baselineCards = await cardCount(page);
    check("the results header prints a count", Number.isFinite(baseline));
    check("the header count is the number of cards", baseline === baselineCards);
    check("there is something to filter", baseline > 0);
    check("no sideways overflow at 390px", !(await overflows(page)));

    const copy = await page.locator("body").innerText();
    check("no charge wording in discovery copy", !/fees?\b/i.test(copy));
    check("no em dash in discovery copy", !copy.includes("—"));

    // -------------------------------------------------- the filter control
    const opener = page.locator('[data-testid="filters-open"]');
    check("the search bar carries the filter control", (await opener.count()) === 1);
    check("the control starts with no count badge", (await page.locator('[data-testid="filters-count"]').count()) === 0);

    await openDrawer(page);
    const drawer = page.locator('[data-testid="filters-drawer"]');
    check("the control opens the drawer", await drawer.isVisible());
    check("the drawer is full page", await page.evaluate(() => {
      const el = document.querySelector('[data-testid="filters-drawer"]');
      if (!el) return false;
      const box = el.getBoundingClientRect();
      return (
        box.width >= window.innerWidth - 1 && box.height >= window.innerHeight - 1
      );
    }));
    check("no sideways overflow with the drawer open", !(await overflows(page)));

    const applyLabel = await page.locator('[data-testid="filters-apply"]').innerText();
    check(
      "the primary button names how many places match",
      applyLabel.replace(/,/g, "").includes(String(baseline)),
    );

    // ----------------------------------------------------- a maximum price
    /* The two naira text boxes are gone: the price is one two-handle slider
       now, so the ceiling is set by driving the maximum handle rather than by
       typing. The product changed shape; the thing being proved did not, which
       is that a ceiling reaches the address bar and narrows the results. */
    const maxHandle = page.locator('[data-testid="filter-range-max"]');
    await maxHandle.evaluate((el) => {
      const input = el;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "100000");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(250);
    await page.locator('[data-testid="filters-apply"]').click();
    await page.waitForTimeout(WAIT);

    check("a maximum price lands in the address bar", page.url().includes("max=100000"));
    const cappedHeader = await headerCount(page);
    const cappedCards = await cardCount(page);
    check("the price cap reduces the results", cappedHeader < baseline);
    check("the capped header count matches the cards", cappedHeader === cappedCards);
    check("the control now carries a count badge", (await page.locator('[data-testid="filters-count"]').count()) === 1);
    check(
      "the price shows as a removable chip",
      (await page.locator('[data-testid="active-price"]').count()) === 1,
    );
    check("no sideways overflow while filtered", !(await overflows(page)));

    // ------------------------------------------------------- clear all
    await openDrawer(page);
    await page.locator('[data-testid="filters-clear"]').click();
    await page.waitForTimeout(WAIT);
    check("clear all drops the price from the address", !page.url().includes("max="));
    check("clear all restores the results", (await headerCount(page)) === baseline);

    // ------------------------------------------------------ category tile
    await page.locator('[data-testid="category-hotel"]').click();
    await page.waitForTimeout(WAIT);
    check("a category tile writes type= into the address", page.url().includes("type=hotel"));
    const hotelHeader = await headerCount(page);
    const hotelCards = await cardCount(page);
    check("the category changes the results", hotelHeader <= baseline);
    check("the category header count matches the cards", hotelHeader === hotelCards);
    check("no sideways overflow on a category", !(await overflows(page)));

    // Back out of the category the same way a traveller would.
    await page.locator('[data-testid="category-all"]').click();
    await page.waitForTimeout(WAIT);
    check("clearing the category restores the results", (await headerCount(page)) === baseline);

    // ------------------------------------------------------- amenity chip
    await openDrawer(page);
    const amenityChips = page.locator('[data-testid^="filter-amenity-"]');
    const amenityCount = await amenityChips.count();
    check("the drawer offers amenity chips", amenityCount > 0);

    if (amenityCount > 0) {
      const testId = await amenityChips.first().getAttribute("data-testid");
      const code = (testId ?? "").replace("filter-amenity-", "");
      await amenityChips.first().click();
      await page.waitForTimeout(200);
      await page.locator('[data-testid="filters-apply"]').click();
      await page.waitForTimeout(WAIT);

      check("an amenity lands in the address bar", page.url().includes(`amenities=${code}`));
      const amenityHeader = await headerCount(page);
      check("the amenity filters the results", amenityHeader <= baseline);
      check("the amenity header count matches the cards", amenityHeader === (await cardCount(page)));
      check(
        "the amenity shows as a removable chip",
        (await page.locator(`[data-testid="active-amenity-${code}"]`).count()) === 1,
      );

      // Removing it through its own chip is a plain navigation.
      await page.locator(`[data-testid="active-amenity-${code}"]`).click();
      await page.waitForTimeout(WAIT);
      check("removing the chip restores the results", (await headerCount(page)) === baseline);
    }

    // --------------------------------------------------- list and map view
    await page.locator('[data-testid="view-map"]').click();
    await page.waitForTimeout(WAIT);
    check("the map toggle writes view= into the address", page.url().includes("view=map"));
    check("no sideways overflow on the map view", !(await overflows(page)));
    await page.locator('[data-testid="view-list"]').click();
    await page.waitForTimeout(WAIT);
    check("the list toggle returns to the grid", (await cardCount(page)) === baseline);

    // ------------------------------------------- a shared filtered address
    await page.goto(
      `${BASE_URL}/search?type=apartment&beds=2&instant=1&sort=price-asc`,
      { waitUntil: "load" },
    );
    await page.waitForTimeout(WAIT);
    const sharedHeader = await headerCount(page);
    check("a shared filtered link renders", Number.isFinite(sharedHeader));
    check("the shared header count matches the cards", sharedHeader === (await cardCount(page)));
    check(
      "the shared link shows its filters as chips",
      (await page.locator('[data-testid="active-beds"]').count()) === 1 &&
        (await page.locator('[data-testid="active-instant"]').count()) === 1,
    );
    check("no sideways overflow on a shared link", !(await overflows(page)));

    // ----------------------------------------------------- rubbish is safe
    await page.goto(
      `${BASE_URL}/search?min=abc&max=-4&beds=99999999999&guests=2.5&amenities=,,&type=unicorn&sort=sideways&view=hologram`,
      { waitUntil: "load" },
    );
    await page.waitForTimeout(WAIT);
    check("rubbish parameters render the unfiltered page", (await headerCount(page)) === baseline);
    check(
      "rubbish parameters leave no active filter chips",
      (await page.locator('[data-testid="active-filters"]').count()) === 0,
    );
  } catch (error) {
    failures += 1;
    console.log(`  FAILED  unexpected error: ${error.message}`);
  } finally {
    await context.close();
  }
}

await browser.close();

console.log(failures === 0 ? "\nAll filter checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
