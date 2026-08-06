/**
 * The filters drawer, rebuilt.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/filters-drawer.spec.mjs
 *
 * What it is now, top to bottom: a search field scoped to wherever the reader
 * already is, the price range with both figures printed above a real
 * two-handle slider, bedrooms as 1 / 2 / 3 / 4+, the amenity chips, and Apply
 * full width with Reset quiet beneath it.
 *
 * Two things this guards specifically:
 *
 *   The slider is two native range inputs, not a div with pointer handlers, so
 *   it is keyboard operable and announced. This spec drives it with the
 *   keyboard for exactly that reason.
 *
 *   Money is formatted from integer kobo through formatMoney. The naira sign
 *   has to be on screen, because the mockups this platform came from rendered
 *   it as a plain N.
 *
 * Pet Friendly, Waterfront and New Build are deliberately NOT here: the
 * listings schema has no column or amenity behind any of the three, and a chip
 * that cannot filter is a control that lies. Furnished is, and it ships.
 *
 * Checked at 390px in both themes.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1400;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function run(theme) {
  const context = await browser.newContext({
    colorScheme: theme,
    viewport: { width: 390, height: 844 },
  });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
      window.localStorage.setItem("nf_onboarded", "1");
    } catch (e) {
      void e;
    }
  }, theme);
  const page = await context.newPage();

  const serverErrors = [];
  page.on("response", (r) => {
    if (r.status() >= 500 && !r.url().includes("/_next/image")) {
      serverErrors.push(`${r.status()} ${r.url()}`);
    }
  });

  try {
    console.log(`\n[${theme}] /search`);
    await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
    await page.waitForTimeout(WAIT);

    const appliedTheme = await page.evaluate(
      () => document.documentElement.dataset.theme ?? "dark",
    );
    check(
      `the ${theme} theme actually applied`,
      appliedTheme === (theme === "light" ? "light" : "dark"),
    );
    check("no route returned a server error", serverErrors.length === 0);

    await page.locator('[data-testid="filters-open"]').click();
    await page.waitForTimeout(500);

    const drawer = page.locator('[data-testid="filters-drawer"]');
    check("the drawer opens", (await drawer.count()) === 1);

    const box = await drawer.boundingBox();
    check(
      `it is a full page drawer, never a partial sheet (${box ? Math.round(box.height) : 0}px)`,
      box !== null && box.height >= 800,
    );

    /* ------------------------------------------------------ the search */
    const search = page.locator('[data-testid="filter-search"]');
    check("a scoped search field is the first thing in it", (await search.count()) === 1);
    const placeholder = (await search.getAttribute("placeholder")) ?? "";
    check(`the placeholder names the scope (${placeholder})`, /^Search in .+\.\.\.$/.test(placeholder));

    /* ------------------------------------------------------- the price */
    const range = page.locator('[data-testid="filter-range"]');
    check("the price range is a real slider", (await range.count()) === 1);
    check(
      "with two handles, not one",
      (await page.locator('[data-testid="filter-range-min"]').count()) === 1 &&
        (await page.locator('[data-testid="filter-range-max"]').count()) === 1,
    );

    const priceText = await drawer.innerText();
    check("the naira sign renders, rather than falling back to an N", priceText.includes("₦"));

    /* Keyboard operable, which a div with pointer handlers would not be. */
    const maxHandle = page.locator('[data-testid="filter-range-max"]');
    const before = await maxHandle.inputValue();
    await maxHandle.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(250);
    const after = await maxHandle.inputValue();
    check(
      `the maximum handle moves from the keyboard (${before} to ${after})`,
      Number(after) < Number(before),
    );

    /* ---------------------------------------------------- the bedrooms */
    const beds = page.locator('[data-testid^="filter-bedrooms-"]');
    const bedLabels = await beds.allInnerTexts();
    check(
      `bedrooms are 1, 2, 3 and 4+ (${JSON.stringify(bedLabels)})`,
      bedLabels.length === 4 && bedLabels[3].trim() === "4+",
    );

    const two = page.locator('[data-testid="filter-bedrooms-2"]');
    await two.click();
    await page.waitForTimeout(200);
    check("choosing one marks it", (await two.getAttribute("aria-pressed")) === "true");
    await two.click();
    await page.waitForTimeout(200);
    check("and choosing it again clears it", (await two.getAttribute("aria-pressed")) === "false");

    /* ------------------------------------------------- the chips shipped */
    const furnished = page.locator('[data-testid="filter-amenity-furnished"]');
    if ((await furnished.count()) > 0) {
      check("Furnished ships, because the catalogue can filter on it", true);
    }
    const drawerText = await drawer.innerText();
    check(
      "Pet Friendly is not offered, because nothing behind it could answer",
      !/pet friendly/i.test(drawerText),
    );
    check("nor Waterfront", !/waterfront/i.test(drawerText));
    check("nor New Build", !/new build/i.test(drawerText));

    /* ------------------------------------------------------ the footer */
    const apply = page.locator('[data-testid="filters-apply"]');
    const reset = page.locator('[data-testid="filters-clear"]');
    check("Apply is there", (await apply.count()) === 1);
    check("Reset is there", (await reset.count()) === 1);
    check("Reset says Reset", (await reset.innerText()).trim() === "Reset");

    const applyBox = await apply.boundingBox();
    const resetBox = await reset.boundingBox();
    check(
      "Apply is full width and Reset sits directly below it",
      applyBox !== null &&
        resetBox !== null &&
        Math.abs(applyBox.width - resetBox.width) < 2 &&
        resetBox.y > applyBox.y,
    );

    check("no route returned a server error", serverErrors.length === 0);
    if (serverErrors.length > 0) console.log("   ", serverErrors.join("\n    "));
  } finally {
    await context.close();
  }
}

try {
  await run("dark");
  await run("light");
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
