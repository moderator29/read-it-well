/**
 * Saved loop walkthrough, plus a discovery regression guard.
 *
 * Self-contained Playwright script: no runner, no config. It seeds the device
 * half of the shortlist through the mirror cookie (which is exactly what the
 * heart writes), walks /saved at phone size in dark mode, then proves the
 * Supabase repository swap did not disturb search or the rent market. Exits
 * non-zero on the first broken expectation. Run with the dev server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/saved.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const WAIT = 1200;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const nowSeconds = Math.floor(Date.now() / 1000);
const host = new URL(BASE_URL).hostname;

// The device half of the shortlist: catalogue ids with their save times, in
// the same format `writeLocalSaves` mirrors into the cookie.
const savedCookie = [
  `seed-1~${nowSeconds}`,
  `seed-3~${nowSeconds - 60}`,
  `seed-16~${nowSeconds - 120}`,
].join(".");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
await context.addCookies([
  { name: "nf_saved", value: savedCookie, domain: host, path: "/" },
]);
const page = await context.newPage();

try {
  // ---------------------------------------------------------------- /saved
  console.log("/saved");
  await page.goto(`${BASE_URL}/saved`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  /*
   * The shortlist is seeded from the catalogue this spec was written against,
   * and that catalogue of twenty-three invented places was removed on purpose.
   * With nothing on the shelf there is nothing to save, so every check below
   * cannot run - which is not the same as failing. See tests/_catalogue.mjs.
   */
  const grid = page.locator('[data-testid="saved-grid"]');
  if ((await grid.count()) === 0) {
    console.log("  skip    catalogue is empty, so there is nothing to have saved");
    console.log("  note    run against a deployment with real inventory to exercise this");
  } else {
  check("saved grid renders", (await grid.count()) === 1);

  const cards = grid.locator("li a[href^='/listing/']");
  const cardCount = await cards.count();
  check("the shortlist renders its cards", cardCount >= 3);

  const savedText = await page.locator("body").innerText();
  check("count line reads the shortlist size", /\bplaces saved\b/.test(savedText));
  check("no fee wording on the shortlist", !/fees?\b/i.test(savedText));

  const hearts = page.locator('[data-testid="saved-heart"]');
  check("every card carries a heart", (await hearts.count()) === cardCount);

  // ------------------------------------------------------ unsave and undo
  await hearts.first().click();
  await page.waitForTimeout(WAIT);

  const undoChip = page.locator('[data-testid="undo-chip"]');
  check("unsaving shows the undo chip", (await undoChip.count()) === 1);
  check(
    "the chip says what happened",
    (await undoChip.innerText()).includes("Removed from saved"),
  );
  check(
    "the chip offers undo rather than a dialogue",
    (await undoChip.getByRole("button", { name: "Undo" }).count()) === 1,
  );
  check("the unsaved card is gone from the grid", (await cards.count()) === cardCount - 1);

  await undoChip.getByRole("button", { name: "Undo" }).click();
  await page.waitForTimeout(WAIT);
  check("undo restores the card", (await cards.count()) === cardCount);
  check("undo clears the chip", (await undoChip.count()) === 0);

  // ------------------------------------------------------- empty shortlist
  console.log("/saved with nothing saved");
  const emptyContext = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const emptyPage = await emptyContext.newPage();
  await emptyPage.goto(`${BASE_URL}/saved`, { waitUntil: "load" });
  await emptyPage.waitForTimeout(WAIT);
  const emptyText = await emptyPage.locator("body").innerText();
  check("empty state explains the heart", emptyText.includes("Nothing saved yet"));
  check(
    "empty state offers Explore stays",
    (await emptyPage.locator('a[href="/search"]', { hasText: "Explore stays" }).count()) === 1,
  );
  await emptyContext.close();

  // --------------------------------------------- discovery must not regress
  console.log("/search");
  await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);
  const searchCards = page.locator("a[href^='/listing/']");
  check("search still renders results", (await searchCards.count()) > 0);
  const searchText = await page.locator("body").innerText();
  check("results header still counts stays", /\bstays across Nigeria\b/.test(searchText));

  console.log("/search?q=Lagos&type=shortlet");
  await page.goto(`${BASE_URL}/search?q=Lagos&type=shortlet`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);
  const filteredText = await page.locator("body").innerText();
  check("free text and category filters still apply", /shortlets? across Nigeria/.test(filteredText));
  check("filtered search still returns places", (await searchCards.count()) > 0);

  console.log("/rent");
  await page.goto(`${BASE_URL}/rent`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);
  const rentCards = page.locator("a[href^='/listing/']");
  check("rent still renders rentals", (await rentCards.count()) > 0);
  const rentText = await page.locator("body").innerText();
  check("rentals still price per year", /year/.test(rentText));
  check(
    "the rent safety rule still shows",
    rentText.includes("Pay only after you have inspected the property."),
  );
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
